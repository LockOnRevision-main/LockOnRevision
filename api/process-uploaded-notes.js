/* global fetch */
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function setCorsHeaders(res) {
  for (const [key, value] of Object.entries(corsHeaders)) {
    res.setHeader(key, value);
  }
}

let geminiApiKey;
let genAI;
let model;
let fileManager;

try {
  geminiApiKey = process.env.GEMINI_API_KEY;
  const geminiModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

  if (!geminiApiKey) {
    console.warn('[process-uploaded-notes] GEMINI_API_KEY not set. AI functions will fail.');
  } else {
    genAI = new GoogleGenerativeAI(geminiApiKey);
    model = genAI.getGenerativeModel({ model: geminiModel });
    fileManager = new GoogleAIFileManager(geminiApiKey);
  }
} catch (initError) {
  console.error('[process-uploaded-notes] Module initialization error:', initError.message);
}

function isConfigured() {
  return !!model;
}

function validateGeminiResponse(data) {
  if (!data || !data.subject || !data.subject.units) {
    throw new Error('Invalid Gemini response structure.');
  }
  return true;
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
      console.error("JSON parse error:", e, "Original text:", text);
      // Attempt to extract JSON from the text if it's wrapped in other text
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
  if (!isConfigured()) throw new Error('Gemini API is not configured.');

  const contents = files.map(f => ({
    fileData: {
      mimeType: f.mimeType,
      fileUri: f.fileUri
    }
  }));

  const result = await model.generateContent([
    ...contents,
    { text: prompt },
  ]);

  const response = await result.response;
  return parseGeminiJson(response.text());
}

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url, mimeType, files: requestedFiles } = req.body;

    // Support both single file (url/mimeType) and multiple files (files array)
    const filesToProcess = [];
    if (url && mimeType) {
      filesToProcess.push({ url, mimeType });
    } else if (Array.isArray(requestedFiles)) {
      filesToProcess.push(...requestedFiles);
    } else {
      return res.status(400).json({ error: 'Missing required fields: url/mimeType or files array' });
    }

    const geminiFiles = [];
    const tempFiles = [];

    for (const file of filesToProcess) {
      // 1. Download file from Cloudinary to /tmp
      const fileName = path.basename(file.url);
      const filePath = path.join('/tmp', fileName);
      const response = await fetch(file.url);
      if (!response.ok) throw new Error(`Failed to download file ${file.url} from Cloudinary: ${response.status}`);
      await pipeline(response.body, fs.createWriteStream(filePath));
      tempFiles.push(filePath);

      // 2. Upload to Gemini File API
      const uploadResponse = await fileManager.uploadFile(filePath, {
        mimeType: file.mimeType,
        displayName: fileName,
      });
      geminiFiles.push({
        fileUri: uploadResponse.file.uri,
        mimeType: file.mimeType
      });
    }

    // 3. Generate curriculum using the files
    const prompt = `You are an expert educational AI. Your goal is to transform the uploaded study notes into a premium, interactive, and structured learning experience.
    
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
    validateGeminiResponse(generated);

    // Clean up tmp files
    for (const filePath of tempFiles) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    return res.status(200).json({ ok: true, data: generated });
  } catch (error) {
    console.error('Error in process-uploaded-notes:', error);
    return res.status(500).json({ error: 'Failed to process uploaded notes. Please try again.' });
  }
}
