import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage, isFirebaseConfigured } from "../config/firebase.js";

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
  if (!isFirebaseConfigured || !storage) {
    throw new Error("Firebase Storage is not configured.");
  }

  validateFile(file);

  const fileName = `${Date.now()}_${file.name}`;
  const storageRef = ref(storage, `temp/${uid}/forge/${fileName}`);

  const snapshot = await uploadBytes(storageRef, file);
  const downloadUrl = await getDownloadURL(snapshot.ref);

  return {
    url: downloadUrl,
    path: `temp/${uid}/forge/${fileName}`,
    name: file.name,
    size: file.size,
    type: file.type,
  };
}

export async function deleteStorageFile(path) {
  if (!isFirebaseConfigured || !storage) return;
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (error) {
    console.warn("Failed to delete storage file:", path, error.message);
  }
}

export async function uploadAndGetContent(uid, file) {
  validateFile(file);

  if (/\.(txt|md|csv|json)$/i.test(file.name)) {
    const text = await file.text();
    return { content: text, type: "text", fileInfo: { name: file.name, size: file.size, type: file.type } };
  }

  if (!isFirebaseConfigured || !storage) {
    return {
      content: `[File: ${file.name}]\nType: ${file.type || "unknown"}\nSize: ${file.size} bytes\nExtract readable concepts from this uploaded document when generating the learning path.`,
      type: "placeholder",
      fileInfo: { name: file.name, size: file.size, type: file.type },
    };
  }

  const uploaded = await uploadTempFile(uid, file);
  return {
    content: `[File: ${file.name}]\nType: ${file.type || "unknown"}\nSize: ${file.size} bytes`,
    type: "binary",
    fileInfo: uploaded,
  };
}
