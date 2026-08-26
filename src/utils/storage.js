import { uploadToCloudinary, isCloudinaryConfigured } from "./cloudinary.js";
import { apiFetch } from "./apiFetch.js";
import { auth } from "../config/firebase.js";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

export function validateFile(file) {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`${file.name} is larger than 20MB.`);
  }
  if (file.type && !ALLOWED_MIME_TYPES.includes(file.type) && !file.type.startsWith("text/")) {
    throw new Error(`File type "${file.type}" is not supported for ${file.name}.`);
  }
}

export async function uploadTempFile(uid, file) {
  if (!isCloudinaryConfigured()) {
    throw new Error("Cloudinary storage is not configured. Please check VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.");
  }

  validateFile(file);

  const result = await uploadToCloudinary(file, {
    folder: `temp/${uid}/forge`,
  });

  return {
    url: result.url,
    publicId: result.publicId,
    name: file.name,
    size: file.size,
    type: file.type,
    resourceType: result.resourceType,
  };
}

export async function deleteStorageFile(publicId, resourceType = "raw") {
  if (!publicId) return;
  try {
    const token = await auth?.currentUser?.getIdToken();
    const response = await apiFetch("/api/delete-cloudinary-files", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ files: [{ publicId, resourceType }] }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.warn("Failed to delete Cloudinary file:", publicId, err.error);
    }
  } catch (error) {
    console.warn("Failed to delete Cloudinary file:", publicId, error.message);
  }
}

export async function uploadAndGetContent(uid, file) {
  validateFile(file);

  if (/\.(txt|md|csv|json)$/i.test(file.name)) {
    try {
      const text = await file.text();
      return { content: text, type: "text", fileInfo: { name: file.name, size: file.size, type: file.type } };
    } catch (error) {
      throw new Error(`Failed to read file content: ${error.message}`);
    }
  }

  if (!isCloudinaryConfigured()) {
    return {
      content: `[File: ${file.name}]\nType: ${file.type || "unknown"}\nSize: ${file.size} bytes\nExtract readable concepts from this uploaded document when generating the learning path.`,
      type: "placeholder",
      fileInfo: { name: file.name, size: file.size, type: file.type },
    };
  }

  try {
    const uploaded = await uploadTempFile(uid, file);
    return {
      content: `[File: ${file.name}]\nType: ${file.type || "unknown"}\nSize: ${file.size} bytes`,
      type: "binary",
      fileInfo: uploaded,
    };
  } catch (error) {
    throw new Error(`File upload failed: ${error.message}`);
  }
}
