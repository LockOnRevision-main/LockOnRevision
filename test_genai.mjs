// Prompt 49: never hard-code credentials. Provide via environment:
//   $env:GEMINI_API_KEY = "<your-key>"  (PowerShell)
// Never commit real key values — a literal was removed here; if it was a
// live key, rotate it in Google Cloud Console (history still contains it).
if (!process.env.GEMINI_API_KEY) {
  throw new Error("Set GEMINI_API_KEY in the environment first.");
}

import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
console.log('GoogleGenAI initialized:', !!ai);