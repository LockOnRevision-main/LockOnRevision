/* global fetch, btoa, URLSearchParams */
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { createLogger, withTimeout, retry, validateFileResponse } from './lib/forge-integrity.js';
import { requireAuth } from './lib/auth.js';

function getCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
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

let genAI;
let model;
let fileManager;

try {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const geminiModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

  if (!geminiApiKey) {
    log.warn('GEMINI_API_KEY not set. AI functions will fail.');
  } else {
    genAI = new GoogleGenerativeAI(geminiApiKey);
    model = genAI.getGenerativeModel({ model: geminiModel });
    fileManager = new GoogleAIFileManager(geminiApiKey);
  }
} catch (initError) {
  log.error('Module initialization error', initError);
}

function isConfigured() {
  return !!model && !!fileManager;
}

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
  const contents = files.map(f => ({
    fileData: {
      mimeType: f.mimeType,
      fileUri: f.fileUri
    }
  }));

  log.info('Calling Gemini with files', { fileCount: files.length });

  const result = await withTimeout(
    retry(() => model.generateContent([...contents, { text: prompt }]), { logger: log }),
    60000
  );

  const response = await result.response;
  const text = response.text();

  if (!text || text.trim().length === 0) {
    throw new Error('Gemini returned empty response');
  }

  log.info('Gemini response received', { length: text.length });

  const parsed = parseGeminiJson(text);
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

    const filesToProcess = [];
    if (url && mimeType) {
      filesToProcess.push({ url, mimeType });
    } else if (Array.isArray(requestedFiles)) {
      filesToProcess.push(...requestedFiles);
    } else {
      return res.status(400).json({ error: 'Missing required fields: url/mimeType or files array' });
    }

    const sourceFiles = filesToProcess.map(f => ({
      publicId: f.publicId,
      resourceType: f.resourceType || 'raw',
    })).filter(f => f.publicId);

    if (!isConfigured()) {
      log.error('Gemini API not configured');
      return res.status(503).json({ error: 'Gemini API is not configured. Set GEMINI_API_KEY.' });
    }

    const geminiFiles = [];
    const tempFiles = [];

    for (const file of filesToProcess) {
      const fileName = path.basename(file.url.split('?')[0]) || `file_${Date.now()}`;
      const filePath = path.join('/tmp', fileName);
      log.info('Downloading file', { url: file.url });
      const response = await fetch(file.url);
      if (!response.ok) throw new Error(`Failed to download file ${file.url}: ${response.status}`);
      await pipeline(response.body, fs.createWriteStream(filePath));
      tempFiles.push(filePath);

      const uploadResponse = await fileManager.uploadFile(filePath, {
        mimeType: file.mimeType || 'application/octet-stream',
        displayName: fileName,
      });
      log.info('File uploaded to Gemini', { fileUri: uploadResponse.file.uri });
      geminiFiles.push({
        fileUri: uploadResponse.file.uri,
        mimeType: file.mimeType || 'application/octet-stream'
      });
    }

    const lang = preferredLanguage || "en";
    const prompt = `You are an expert educational AI. Your goal is to transform the uploaded study notes into a premium, interactive, and structured learning experience.

IMPORTANT: Generate all content ONLY in the user's preferred language: "${lang}". All titles, descriptions, summaries, concepts, exercises, questions, options, correct answers, and explanations must be in this language. Maintain educational terminology appropriate for that language. Never translate from English afterwards.
    
Analyze the provided files and generate a highly structured JSON response representing a complete subject curriculum.
 
Follow these strict requirements:
1. Subject Analysis: Identify the primary subject, curriculum, and target syllabus level.
2. Structure: Break down the content into logical Units -> Subunits -> Lessons.
3. Lessons: Every lesson must be focused, active-recall-oriented, and designed for 2-5 minutes of engagement.
4. Lesson Types: Use diverse interaction types (multipleChoice, fillBlank, matchPairs, arrangeOrder, etc.) appropriate to the subject matter.
5. Interactive Exercises: For each lesson, generate 3-5 rigorous, high-quality exercises that reinforce understanding.
6. Validation: Every exercise must have a clear "correctAnswer" and a concise, educational "explanation".

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
                    "type": "string",
                    "question": "string",
                    "options": ["string"],
                    "correctAnswer": "string",
                    "explanation": "string"
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
`;

    const generated = await callGeminiWithFiles(geminiFiles, prompt);

    for (const filePath of tempFiles) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    deleteCloudinarySourceFiles(sourceFiles);

    return res.status(200).json({ ok: true, data: generated });
  } catch (error) {
    log.error('Failed to process uploaded notes', error);
    return res.status(500).json({ error: 'Failed to process uploaded notes. Gemini could not generate a valid curriculum. Please try again with clearer files.' });
  }
});
