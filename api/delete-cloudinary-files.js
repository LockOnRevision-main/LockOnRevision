/* global fetch, btoa, URLSearchParams */
import { requireAuth } from './lib/auth.js';

function getCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary Admin API is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.');
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
    const { files } = req.body;

    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'Missing required field: files array' });
    }

    let cloudinaryConfig;
    try {
      cloudinaryConfig = getCloudinaryConfig();
    } catch (configError) {
      return res.status(503).json({ error: configError.message });
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
      } catch (error) {
        console.warn(`Failed to delete ${publicId}:`, error.message);
        results.push({ publicId, status: 'failed', error: error.message });
      }
    }

    return res.status(200).json({ ok: true, results });
  } catch (error) {
    console.error('Failed to delete Cloudinary files:', error);
    return res.status(500).json({ error: 'Failed to delete Cloudinary files.' });
  }
});
