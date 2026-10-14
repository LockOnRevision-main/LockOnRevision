/**
 * Beta 1.9 Prompt 44 — Stage D: shared server-side validation + Spark-safe rate limiting.
 * Reuses the repository's existing validation style (explicit, throwing).
 */

export function assertString(v, name, { max = 200, optional = false } = {}) {
  if (v === undefined || v === null) {
    if (optional) return;
    throw Object.assign(new Error(`Missing required field: ${name}`), { status: 400 });
  }
  if (typeof v !== "string" || v.trim().length === 0) {
    throw Object.assign(new Error(`Invalid ${name}: must be a non-empty string`), { status: 400 });
  }
  if (v.length > max) throw Object.assign(new Error(`Invalid ${name}: too long`), { status: 400 });
}

export function assertEnum(v, name, allowed) {
  if (!allowed.includes(v)) {
    throw Object.assign(new Error(`Invalid ${name}: must be one of ${allowed.join(", ")}`), { status: 400 });
  }
}

const SCHOOL_ROLES = ["school_admin", "coordinator", "teacher", "student"];
const MEMBERSHIP_STATUS = ["active", "removed", "pending"];

export function validateSchoolInput(data) {
  assertString(data.name, "name", { max: 120 });
  if (data.type !== undefined) assertEnum(data.type, "type", ["academy", "external"]);
  if (data.country !== undefined && data.country !== null) assertString(data.country, "country", { max: 80, optional: true });
  return { name: data.name.trim(), type: data.type || "external", country: data.country || null };
}

export function validateClassroomInput(data) {
  assertString(data.schoolId, "schoolId", { max: 128 });
  assertString(data.name, "name", { max: 120 });
  if (data.yearGroup !== undefined && data.yearGroup !== null) assertString(data.yearGroup, "yearGroup", { max: 40, optional: true });
  return { schoolId: data.schoolId, name: data.name.trim(), yearGroup: data.yearGroup || null };
}

export function validateMembershipInput(data) {
  assertString(data.uid, "uid", { max: 128 });
  assertString(data.schoolId, "schoolId", { max: 128 });
  assertEnum(data.role, "role", SCHOOL_ROLES);
  if (data.classroomId !== undefined && data.classroomId !== null) assertString(data.classroomId, "classroomId", { max: 128, optional: true });
  if (data.status !== undefined) assertEnum(data.status, "status", MEMBERSHIP_STATUS);
  return {
    uid: data.uid, schoolId: data.schoolId, role: data.role,
    classroomId: data.classroomId || null, status: data.status || "active",
  };
}

/** Deterministic membership doc id so repeats cannot duplicate. */
export function membershipDocId(uid, schoolId) {
  const safe = (s) => String(s).replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 128);
  return `${safe(uid)}_${safe(schoolId)}`;
}

/**
 * In-memory token-bucket rate limiter for Vercel serverless.
 * LIMITATION (documented): serverless instances do not share memory, so this
 * is best-effort per-instance protection, not a strict global limit.
 * It never weakens security — it only adds friction. Strict global limiting
 * needs Blaze + Redis/Firestore counters (documented as follow-up).
 */
const buckets = new Map();
export function rateLimit(key, { max = 20, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1 };
  }
  entry.count += 1;
  if (entry.count > max) return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  return { allowed: true, remaining: max - entry.count };
}

export function rateLimitKey(req, scope) {
  const ip = req.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
  const uid = req.user?.uid || "anon";
  return `${scope}:${uid}:${ip}`;
}
