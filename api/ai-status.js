import { createLogger } from './lib/forge-integrity.js';

const log = createLogger('ai-status');

const VALID_KEY_RE = /^AIza[0-9A-Za-z_-]{20,}$/;

let configured = false;
let modelName = null;
let reason = null;

try {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  if (!geminiApiKey) {
    reason = 'GEMINI_API_KEY environment variable is not set';
    log.warn(reason);
  } else if (!VALID_KEY_RE.test(geminiApiKey.trim())) {
    reason = 'GEMINI_API_KEY is set but does not look like a valid Google AI Studio key (expected AIza...)';
    log.warn(reason);
  } else {
    configured = true;
    modelName = geminiModel;
    log.info('Gemini configured', { model: modelName });
  }
} catch (initError) {
  reason = initError.message;
  log.error('Status initialization error', initError);
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
