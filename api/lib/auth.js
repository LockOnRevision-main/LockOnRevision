import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let adminApp = null;
let adminInitError = null;

function getAdminApp() {
  if (adminApp) return adminApp;

  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    adminInitError = "Firebase project ID not configured";
    return null;
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  try {
    if (clientEmail && privateKey) {
      adminApp = initializeApp({
        credential: cert({ projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, "\n") }),
      });
    } else {
      adminApp = initializeApp({ projectId });
    }
    return adminApp;
  } catch (e) {
    adminInitError = e.message;
    return null;
  }
}

export async function verifyAuth(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header");
  }

  const token = authHeader.split("Bearer ")[1];
  const app = getAdminApp();

  if (!app) {
    throw new Error(adminInitError || "Firebase Admin SDK not configured");
  }

  try {
    return await getAuth(app).verifyIdToken(token);
  } catch {
    throw new Error("Invalid or expired token");
  }
}

export function requireAuth(handler) {
  return async (req, res) => {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    for (const [key, value] of Object.entries(corsHeaders)) {
      res.setHeader(key, value);
    }

    if (req.method === "OPTIONS") return res.status(204).end();

    try {
      req.user = await verifyAuth(req);
      return handler(req, res);
    } catch (error) {
      return res.status(401).json({ error: error.message });
    }
  };
}
