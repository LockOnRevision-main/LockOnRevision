const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || import.meta.env.CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || import.meta.env.CLOUDINARY_UPLOAD_PRESET;

const MAX_RETRIES = 3;

function getResourceType(file) {
  if (file.type?.startsWith('image/')) return 'image';
  if (file.type?.startsWith('video/')) return 'video';
  return 'raw';
}

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function uploadToCloudinary(file, options = {}) {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Cloudinary configuration is missing. Please set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.');
  }

  const resourceType = options.resourceType || getResourceType(file);
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);

  if (options.folder) {
    formData.append('folder', options.folder);
  }

  let lastError;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      console.log('[cloudinary-upload]', JSON.stringify({
        status: response.status,
        secure_url: data.secure_url,
        public_id: data.public_id,
        resource_type: data.resource_type,
        type: data.type,
      }));

      if (!response.ok) {
        throw new Error(data.error?.message || `Cloudinary upload failed with status ${response.status}`);
      }

      return {
        url: data.secure_url,
        publicId: data.public_id,
        format: data.format,
        bytes: data.bytes,
        resourceType: data.resource_type,
      };
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES - 1) {
        const delayMs = Math.pow(2, attempt) * 1000;
        console.warn(`Cloudinary upload attempt ${attempt + 1} failed:`, error.message, `- retrying after ${delayMs}ms`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        console.error(`Cloudinary upload failed after ${MAX_RETRIES} attempts:`, error.message);
      }
    }
  }

  throw new Error(`Cloudinary upload failed after ${MAX_RETRIES} attempts: ${lastError.message}`);
}

export function isCloudinaryConfigured() {
  return !!(CLOUD_NAME && UPLOAD_PRESET);
}
