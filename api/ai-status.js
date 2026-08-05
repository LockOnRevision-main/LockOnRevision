import { createLogger } from './lib/forge-integrity.js';

const log = createLogger('ai-status');



let configured = false;
let modelName = null;
let reason = null;

try {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  if (!geminiApiKey?.trim()) {
    reason = 'GEMINI_API_KEY environment variable is not set';
    log.warn(reason);
  } else {
    configured = true;
    modelName = geminiModel;
    log.info('Gemini configured', { model: modelName });
  }
} catch (err) {
  reason = err.message;
  log.error('Status initialization error', err);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return res.status(200).json({
    provider: 'Google Gemini',
    apiKeyName: 'GEMINI_API_KEY',
    configured,
    model: modelName,
    reason: configured ? null : reason,
  });
}
