/* global btoa, URLSearchParams */
import { requireAuth } from '../lib/auth.js';
import { checkAiGuard, aiFailed } from '../lib/aiLimits.js';

function getCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY || process.env.VITE_CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET || process.env.VITE_CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary file service is not configured.');
  }

  return { cloudName, apiKey, apiSecret };
}

async function destroyCloudinaryFile(cloudName, apiKey, apiSecret, publicId, resourceType) {
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`;
  const credentials = btoa(`${apiKey}:${apiSecret}`);

  const formData = new URLSearchParams();
  formData.append('public_id', publicId);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  const data = await response.json();

  if (data.result !== 'ok') {
    throw new Error(data.error?.message || `Cloudinary destroy failed with result: ${data.result}`);
  }

  return data;
}

export default requireAuth(async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // P51 1.3: request-size cap + authenticated-user rate limit BEFORE any
    // third-party call (per-instance best-effort; caps are the hard
    // guarantee). At most 20 files per request.
    if (!checkAiGuard(req, res, "delete-cloudinary-files")) return;

    const { files } = req.body;

    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'Missing required field: files array' });
    }
    if (files.length > 20) {
      return res.status(413).json({ error: 'Too many files. Send at most 20 per request.', code: 'ai_too_large' });
    }

    let cloudinaryConfig;
    try {
      cloudinaryConfig = getCloudinaryConfig();
    } catch {
      return res.status(503).json({ error: 'File service is temporarily unavailable. Please try again later.', code: 'ai_unavailable' });
    }

    const { cloudName, apiKey, apiSecret } = cloudinaryConfig;
    const results = [];

    for (const file of files) {
      const { publicId, resourceType = 'raw' } = file;
      if (!publicId) {
        results.push({ publicId, status: 'skipped', reason: 'No publicId provided' });
        continue;
      }

      try {
        await destroyCloudinaryFile(cloudName, apiKey, apiSecret, publicId, resourceType);
        results.push({ publicId, status: 'deleted' });
      } catch {
        // Safe per-file error: never echo provider messages.
        results.push({ publicId, status: 'failed', error: 'Delete failed. Please try again.' });
      }
    }

    return res.status(200).json({ ok: true, results });
  } catch {
    return res.status(500).json(aiFailed('Failed to delete files. Please try again.'));
  }
});
