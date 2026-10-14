/**
 * POST /api/search-students — scoped student search.
 * Body: { schoolId, classroomId?, prefix?, page?, pageSize? }
 * Caller must hold school_admin/coordinator/teacher in `schoolId`
 * (platform admins: any school). Impossible to enumerate outside scope:
 * the membership query is always constrained to the caller's school(s).
 * Prefix search: normalised lowercase prefix on users_public.searchName
 * (Firestore has no full-text search — LIMITATION documented below).
 * Returns minimum fields only — NEVER email. Max page size 50.
 */
import { getAdminDb, cors, authedUser, checkRate, requirePermission } from "./_lib/schoolServer.js";

const MAX_PAGE = 50;

export function normalisePrefix(s) {
  return String(s || "").trim().toLowerCase().slice(0, 80);
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const user = await authedUser(req, res);
  if (!user) return;
  if (!checkRate(req, res, "search-students", 30)) return;

  const { schoolId, classroomId = null, prefix = "", page = 1, pageSize = 20 } = req.body || {};
  if (typeof schoolId !== "string" || !schoolId.trim()) return res.status(400).json({ error: "Invalid schoolId." });
  const size = Math.min(Math.max(Number(pageSize) || 20, 1), MAX_PAGE);
  const pg = Math.max(Number(page) || 1, 1);

  try {
    const db = await getAdminDb();
    const staff = await requirePermission(db, req, res, schoolId, "roster.view", classroomId);
    if (!staff) return;

    let q = db.collection("memberships")
      .where("schoolId", "==", schoolId)
      .where("status", "==", "active")
      .where("role", "==", "student");
    if (classroomId) {
      if (typeof classroomId !== "string") return res.status(400).json({ error: "Invalid classroomId." });
      q = q.where("classroomId", "==", classroomId);
    }
    const snap = await q.get();
    const norm = normalisePrefix(prefix);

    // Resolve display data from users_public (bounded by school membership).
    // LIMITATION: prefix filtering is done server-side in memory over the
    // school's roster (Firestore lacks full-text search). For very large
    // schools (>~10K students) paginate by roster chunks — documented.
    let items = [];
    for (const doc of snap.docs) {
      const m = doc.data() || {};
      const pub = await db.collection("users_public").doc(m.uid).get();
      const p = pub.exists ? pub.data() || {} : {};
      const name = p.displayName || p.name || "";
      if (norm && !(p.searchName || name.toLowerCase()).startsWith(norm)) continue;
      items.push({
        uid: m.uid,
        name, username: p.username || "",
        avatarUrl: p.avatarUrl || "", avatarIcon: p.avatarIcon || "",
        grade: p.grade || "", curriculum: p.curriculum || "",
        classroomId: m.classroomId || null,
        totalScore: typeof p.totalScore === "number" ? p.totalScore : 0,
      });
    }
    items.sort((a, b) => (a.name || "").localeCompare(b.name || "") || (a.uid < b.uid ? -1 : 1));
    const total = items.length;
    const start = (pg - 1) * size;
    return res.status(200).json({
      ok: true, items: items.slice(start, start + size),
      total, page: pg, pageSize: size, totalPages: Math.max(1, Math.ceil(total / size)),
    });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.status ? e.message : "Search failed." });
  }
}
