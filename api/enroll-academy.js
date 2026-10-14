/**
 * Beta 1.9 Prompt 44 (Stage E) + Prompt 45 (Stage 1): secure auto-enrolment
 * of new students + server-side public-projection creation.
 * POST /api/enroll-academy — verifies the caller's ID token, then via the
 * Admin SDK: creates their own memberships/{uid}_academy (student only),
 * upserts users_public/{uid} (leaderboard-safe fields, no email/admin),
 * and appends an adminAuditLogs entry for the enrolment.
 * Rate-limited (best-effort per-instance on serverless; see validation.js).
 */
import { verifyAuth } from "./_lib/auth.js";
import { rateLimit, rateLimitKey } from "./_lib/validation.js";
import { auditRef, auditData } from "./_lib/schoolServer.js";

const ACADEMY_ID = "academy";
const mid = (uid) => `${String(uid).replace(/[^A-Za-z0-9_-]/g, "_")}_${ACADEMY_ID}`;

let adminDb = null;
async function getAdminDb() {
  if (adminDb) return adminDb;
  const { initializeApp, getApps, cert } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");
  if (getApps().length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (privateKey && privateKey.includes("\\n")) privateKey = privateKey.replace(/\\n/g, "\n");
    if (!projectId || !clientEmail || !privateKey) throw new Error("Server not configured");
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  }
  adminDb = getFirestore();
  return adminDb;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let user;
  try {
    user = await verifyAuth(req);
  } catch (e) {
    return res.status(401).json({ error: e.message });
  }
  req.user = user;

  const rl = rateLimit(rateLimitKey(req, "enroll-academy"), { max: 5, windowMs: 60_000 });
  if (!rl.allowed) return res.status(429).json({ error: "Too many requests. Try again later." });

  try {
    const db = await getAdminDb();
    const ref = db.collection("memberships").doc(mid(user.uid));
    const snap = await ref.get();
    const now = new Date().toISOString();
    if (snap.exists && snap.data()?.status === "active") {
      // Still ensure the server-side public projection exists (Stage 1).
      await ensurePublicProjection(db, user.uid);
      return res.status(200).json({ ok: true, already: true });
    }
    // Stage 0.3: membership + projection + audit commit atomically.
    const userSnap = await db.collection("users").doc(user.uid).get();
    const batch = db.batch();
    batch.set(ref, {
      uid: user.uid, schoolId: ACADEMY_ID, role: "student", classroomId: null,
      status: "active", createdAt: now,
      updatedAt: now, removedAt: null, removedBy: null,
    }, { merge: true });
    if (userSnap.exists) {
      batch.set(db.collection("users_public").doc(user.uid), projectPublicDoc(userSnap.data() || {}), { merge: true });
    }
    batch.set(auditRef(db), auditData({
      actorUid: user.uid, action: "membership.self-enrol", targetUid: user.uid,
      schoolId: ACADEMY_ID, scope: "school",
    }));
    await batch.commit();
    return res.status(200).json({ ok: true, already: false });
  } catch (e) {
    const status = e.status || 500;
    return res.status(status).json({ error: status === 500 ? "Enrolment failed" : e.message });
  }
}

/**
 * Server-side users_public upsert from the authoritative users doc.
 * Only leaderboard-safe fields; never email, isAdmin, role, or internals.
 * Pure projection builder (no writes) so callers can batch it atomically.
 */
function projectPublicDoc(d) {
  return {
    name: typeof d.name === "string" ? d.name.slice(0, 120) : "",
    username: typeof d.username === "string" ? d.username.slice(0, 80) : "",
    displayName: typeof d.name === "string" ? d.name.slice(0, 120) : "",
    avatarUrl: typeof d.avatarUrl === "string" ? d.avatarUrl.slice(0, 500) : "",
    avatarIcon: typeof d.avatarIcon === "string" ? d.avatarIcon.slice(0, 80) : "",
    xp: typeof d.xp === "number" ? d.xp : 0,
    energy: typeof d.energy === "number" ? d.energy : 0,
    totalScore: typeof d.totalScore === "number" ? d.totalScore : 0,
    grade: typeof d.grade === "string" ? d.grade.slice(0, 40) : "",
    curriculum: typeof d.curriculum === "string" ? d.curriculum.slice(0, 80) : "",
    searchName: typeof d.name === "string" ? d.name.trim().toLowerCase().slice(0, 120) : "",
    updatedAt: new Date().toISOString(),
  };
}

async function ensurePublicProjection(db, uid) {
  try {
    const snap = await db.collection("users").doc(uid).get();
    if (!snap.exists) return;
    await db.collection("users_public").doc(uid).set(projectPublicDoc(snap.data() || {}), { merge: true });
  } catch {
    // Best-effort only.
  }
}
