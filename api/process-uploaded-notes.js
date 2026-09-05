/* global btoa, URLSearchParams */
import { URL } from 'url';
import { GoogleGenAI, createPartFromUri, createUserContent } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { createLogger, withTimeout, retry, validateFileResponse } from './_lib/forge-integrity.js';
import { requireAuth } from './_lib/auth.js';

const ALLOWED_HOSTS = new Set([
  'res.cloudinary.com',
  'cloudinary.com',
  'api.cloudinary.com',
]);
const BLOCKED_IPS = new Set([
  '127.0.0.1',
  '169.254.169.254',
  '::1',
  '0.0.0.0',
]);
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata',
  'metadata.google.internal',
]);

async function validateUrl(urlString) {
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new Error('Invalid URL format');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only HTTP/HTTPS protocols are allowed');
  }

  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new Error('Access to this hostname is blocked');
  }

  if (ALLOWED_HOSTS.size > 0 && !ALLOWED_HOSTS.has(hostname)) {
    throw new Error('URL hostname is not in the allowed list');
  }

  try {
    const { lookup } = await import('dns/promises');
    const { address } = await lookup(hostname, { family: 4 });
    if (BLOCKED_IPS.has(address)) {
      throw new Error('Access to this IP address is blocked');
    }
  } catch (dnsError) {
    if (dnsError.message.includes('ENOTFOUND') || dnsError.message.includes('ENODATA')) {
      throw new Error('Could not resolve hostname');
    }
    throw dnsError;
  }

  return parsed;
}

function getCloudinaryConfig() {
  console.log({
    cwd: process.cwd(),
    cloud: !!process.env.CLOUDINARY_CLOUD_NAME,
    key: !!process.env.CLOUDINARY_API_KEY,
    secret: !!process.env.CLOUDINARY_API_SECRET,
  });
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY || process.env.VITE_CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET || process.env.VITE_CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

async function deleteCloudinarySourceFiles(files) {
  const config = getCloudinaryConfig();
  if (!config) {
    log.warn('Cloudinary Admin API not configured — skipping source file deletion.');
    return;
  }
  for (const file of files) {
    if (!file.publicId) continue;
    try {
      const url = `https://api.cloudinary.com/v1_1/${config.cloudName}/${file.resourceType || 'raw'}/destroy`;
      const credentials = btoa(`${config.apiKey}:${config.apiSecret}`);
      const formData = new URLSearchParams();
      formData.append('public_id', file.publicId);
      const response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      });
      const data = await response.json();
      if (data.result === 'ok') {
        log.info('Deleted Cloudinary source file', { publicId: file.publicId });
      } else {
        log.warn('Cloudinary delete returned non-ok', { publicId: file.publicId, result: data.result });
      }
    } catch (error) {
      log.warn('Failed to delete Cloudinary source file', { publicId: file.publicId, error: error.message });
    }
  }
}

const log = createLogger('process-uploaded-notes');

console.log('Cloudinary env verification:', JSON.stringify({
  cloud: !!process.env.CLOUDINARY_CLOUD_NAME,
  key: !!process.env.CLOUDINARY_API_KEY,
  secret: !!process.env.CLOUDINARY_API_SECRET,
}));

log.info('Cloudinary config check', {
  cloudName: process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME,
  apiKey: !!process.env.CLOUDINARY_API_KEY,
  apiSecret: !!process.env.CLOUDINARY_API_SECRET,
});

let googleAI;
let geminiModel;

try {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  geminiModel = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';

  log.info('Gemini API key check', { keySet: !!geminiApiKey });

  if (!geminiApiKey) {
    log.warn('GEMINI_API_KEY not set. AI functions will fail.');
  } else {
    googleAI = new GoogleGenAI({ apiKey: geminiApiKey });
    log.info('GoogleGenAI initialized successfully');
  }
} catch (initError) {
  log.error('Module initialization error', initError);
}

function isConfigured() {
  return !!googleAI;
}

log.info('Gemini configuration status', { configured: isConfigured() });

function parseGeminiJson(text) {
  try {
    const cleaned = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();
    return JSON.parse(cleaned);
  } catch (e) {
    log.error('JSON parse error', { originalText: text.slice(0, 500) });
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        throw e;
      }
    }
    throw e;
  }
}

async function callGeminiWithFiles(files, prompt) {
  const parts = files.map(f => createPartFromUri(f.fileUri, f.mimeType));

  log.info('Calling Gemini with files', { fileCount: files.length });

  const result = await withTimeout(
    retry(() => googleAI.models.generateContent({ model: geminiModel, contents: [createUserContent([...parts, prompt])] }), { logger: log }),
    60000
  );

  const text = result.text;

  if (!text || text.trim().length === 0) {
    log.error('Gemini returned empty response');
    throw new Error('Gemini returned empty response');
  }

  log.info('Gemini response received', { length: text.length });

  const parsed = parseGeminiJson(text);
  log.info('JSON parsed successfully from Gemini response');

  validateFileResponse(parsed);

  log.info('File-based structure validated successfully', {
    subject: parsed.subject.title,
    unitCount: parsed.subject.units.length,
  });

  return parsed;
}

export default requireAuth(async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url, mimeType, files: requestedFiles, preferredLanguage } = req.body;

    log.info('Handler called', { hasUrlMime: !!url && !!mimeType, hasFilesArray: Array.isArray(requestedFiles) });

    const filesToProcess = [];
    if (url && mimeType) {
      filesToProcess.push({ url, mimeType });
    } else if (Array.isArray(requestedFiles)) {
      filesToProcess.push(...requestedFiles);
    } else {
      return res.status(400).json({ error: 'Missing required fields: url/mimeType or files array' });
    }

    log.info('Files to process', { count: filesToProcess.length, firstUrl: filesToProcess[0]?.url });

    const sourceFiles = filesToProcess.map(f => ({
      publicId: f.publicId,
      resourceType: f.resourceType || 'raw',
    })).filter(f => f.publicId);

    log.info('Source files for Cloudinary cleanup', { count: sourceFiles.length });

    if (!isConfigured()) {
      log.error('Gemini API not configured');
      return res.status(503).json({ error: 'Gemini API is not configured. Set GEMINI_API_KEY.' });
    }

    const geminiFiles = [];
    const tempFiles = [];

    for (const file of filesToProcess) {
      try {
        await validateUrl(file.url);
      } catch (validateError) {
        log.warn(`URL validation failed for file, skipping:`, validateError.message);
        continue;
      }
      const fileName = path.basename(new URL(file.url).pathname.split('?')[0]) || `file_${Date.now()}`;
      const filePath = path.join('/tmp', fileName);
      const downloadUrl = file.url;
      log.info('Downloading file', { url: downloadUrl });
      if (!/^https?:\/\//.test(downloadUrl)) {
        log.warn('Suspicious download URL detected', { url: downloadUrl });
      }
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error(`Failed to download file ${downloadUrl}: ${response.status}`);
      await pipeline(response.body, fs.createWriteStream(filePath));
      log.info('File saved to temp storage', { filePath });
      tempFiles.push(filePath);

      const uploadResponse = await googleAI.files.upload({
        file: filePath,
        config: {
          mimeType: file.mimeType || 'application/octet-stream',
          displayName: fileName,
        },
      });
      log.info('File uploaded to Gemini', { fileUri: uploadResponse.uri });
      geminiFiles.push({
        fileUri: uploadResponse.uri,
        mimeType: uploadResponse.mimeType || file.mimeType || 'application/octet-stream'
      });
    }

    const lang = preferredLanguage || "en";
     const prompt = `You are an expert educational AI. Your goal is to transform the uploaded study notes into a premium, interactive, and structured learning experience.

IMPORTANT: Generate all content ONLY in the user's preferred language: "${lang}". All titles, descriptions, summaries, concepts, exercises, questions, options, correct answers, and explanations must be in this language. Maintain educational terminology appropriate for that language. Never translate from English afterwards.
    
Analyze the provided files and generate a highly structured JSON response representing a complete subject curriculum.
 
Follow these strict requirements:
1. Subject Analysis: Identify the primary subject, curriculum, and target syllabus level (e.g., CBSE/NCERT/JEE/GCSE/AP). STAY STRICTLY WITHIN THAT CURRICULUM – extra information only if it directly supports understanding of the prescribed syllabus (intuition, real-world analogy, case study). Do NOT introduce topics outside the syllabus.
2. Structure: Break down the content into logical Units -> Subunits -> Lessons.
3. Lessons: Every lesson must be focused, active-recall-oriented, and designed for 2-5 minutes of engagement. Difficulty default medium-hard, requiring students to connect ideas.
4. Lesson Types: Use diverse interaction types (multipleChoice, fillBlank, matchPairs, arrangeOrder, etc.) appropriate to the subject matter.
5. Interactive Exercises: For each lesson, generate 3-5 rigorous exercises where each stem is 2-4 sentences with relevant background/context/scenario/data before asking. Reward reasoning over keyword matching via case studies, data interpretation, cause-effect, compare/justify, best-explanation. Encourage realistic scenarios.
6. Validation: Every exercise must have a clear "correctAnswer" and a rich 2-3 sentence "explanation" (why correct, why others wrong).

Return ONLY valid JSON with this structure:
{
  "subject": {
    "title": "string",
    "description": "string",
    "units": [
      {
        "title": "string",
        "summary": "string",
        "subUnits": [
          {
            "title": "string",
            "summary": "string",
            "lessons": [
              {
                "title": "string",
                "summary": "string",
                "concept": "string",
                "difficulty": "easy|medium|hard",
                "interactionTypes": ["string"],
                "keyPoints": ["string"],
                "exercises": [
                  {
                    "type": "multipleChoice|fillBlank|matchPairs|arrangeOrder|trueFalse|shortAnswer",
                    "question": "2-4 sentence contextual stem (background + scenario) then question",
                    "options": ["For multipleChoice: 4 plausibly close options; for matchPairs/arrangeOrder leave []"],
                    "pairs": [{"left":{"id":"l1","text":"term"},"right":{"id":"r1","text":"definition"}}],
                    "items": [{"id":"item1","text":"step"}],
                    "correctAnswer": "For multipleChoice/fillBlank: answer text; for matchPairs: 'l1-r1,l2-r2,...'; for arrangeOrder: 'id1,id2,...'",
                    "explanation": "2-3 sentences: why correct, conceptual link, why distractors fail",
                    "variants": [{"question":"alt phrasing","options":[],"correctAnswer":"...","explanation":"..."}]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
}
SCHEMA NOTES: matchPairs MUST use "pairs": [{"left":{"id":"l1","text":"..."},"right":{"id":"r1","text":"..."}}] with 3-5 pairs. arrangeOrder MUST use "items": [{"id":"item1","text":"..."}] with 4-6 items. Do NOT put matching data in "options". VARIANTS: each exercise MUST include "variants": 2-4 alternatives with same objective but different wording/context for anti-memorization; stored and randomly selected at lesson load without regenerating lesson.
`;

    const generated = await callGeminiWithFiles(geminiFiles, prompt);

    log.info('Gemini processing completed, cleaning up temp files');

    for (const filePath of tempFiles) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        log.info('Temp file deleted', { filePath });
      }
    }

    log.info('Calling deleteCloudinarySourceFiles', { sourceFileCount: sourceFiles.length });
    deleteCloudinarySourceFiles(sourceFiles);

    return res.status(200).json({ ok: true, data: generated });
  } catch (error) {
    log.error('Failed to process uploaded notes', error);
    const statusCode = error.message?.includes('Gemini API is not configured') ? 503 : 500;
    const errorMessage = error.message || 'Failed to process uploaded notes';
    return res.status(statusCode).json({ error: errorMessage });
  }
});
