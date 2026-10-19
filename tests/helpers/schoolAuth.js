/**
 * Stage 0 harness: 7-identity auth matrix + rule-logic mirrors.
 * Mirrors firestore.rules school logic so isolation is testable WITHOUT
 * the Firebase emulator (repeatable in CI). Emulator instructions:
 * docs/EMULATOR_TESTS.md. Any divergence between these mirrors and
 * firestore.rules is a P1 bug — keep them in sync.
 */

export const IDENTITIES = {
  anon: null,
  studentA: { uid: "stu-a", email: "a@example.com" },
  teacherA: { uid: "tch-a", email: "tch-a@example.com" },
  coordinatorA: { uid: "coord-a", email: "coord-a@example.com" },
  schoolAdminA: { uid: "adm-a", email: "adm-a@example.com" },
  schoolAdminB: { uid: "adm-b", email: "adm-b@example.com" },
  platformAdmin: { uid: "platform-1", email: "owner@example.com" },
};

/** In-memory school state for tests: memberships keyed `${uid}_${schoolId}`. */
export function makeSchoolState() {
  return {
    users: {
      "platform-1": { isAdmin: true, role: "admin" },
      "stu-a": { role: "user" },
      "tch-a": { role: "user" },
      "coord-a": { role: "user" },
      "adm-a": { role: "user" },
      "adm-b": { role: "user" },
    },
    memberships: {
      "stu-a_school-a": { uid: "stu-a", schoolId: "school-a", role: "student", status: "active" },
      "tch-a_school-a": { uid: "tch-a", schoolId: "school-a", role: "teacher", status: "active" },
      "coord-a_school-a": { uid: "coord-a", schoolId: "school-a", role: "coordinator", status: "active" },
      "adm-a_school-a": { uid: "adm-a", schoolId: "school-a", role: "school_admin", status: "active" },
      "adm-b_school-b": { uid: "adm-b", schoolId: "school-b", role: "school_admin", status: "active" },
    },
  };
}

// ---- Rule mirrors (must match firestore.rules) ----
export function isPlatformAdmin(state, uid) {
  const u = state.users[uid];
  return !!u && (u.isAdmin === true || u.role === "admin");
}

export function isSchoolMember(state, uid, schoolId) {
  const m = state.memberships[`${uid}_${schoolId}`];
  return !!m && m.status === "active";
}

export function schoolRole(state, uid, schoolId) {
  return isSchoolMember(state, uid, schoolId) ? state.memberships[`${uid}_${schoolId}`].role : "";
}

export function canReadSchool(state, uid, schoolId) {
  if (!uid) return false;
  return isPlatformAdmin(state, uid) || isSchoolMember(state, uid, schoolId);
}

export function canManageSchool(state, uid, schoolId) {
  if (!uid) return false;
  return isPlatformAdmin(state, uid) || schoolRole(state, uid, schoolId) === "school_admin";
}

export function canTeachSchool(state, uid, schoolId) {
  if (!uid) return false;
  if (isPlatformAdmin(state, uid)) return true;
  const r = schoolRole(state, uid, schoolId);
  return r === "school_admin" || r === "coordinator";
}

export function canReadMembership(state, callerUid, target) {
  if (!callerUid || !target) return false;
  if (isPlatformAdmin(state, callerUid)) return true;
  if (target.uid === callerUid) return true;
  const r = schoolRole(state, callerUid, target.schoolId);
  return r === "school_admin" || r === "coordinator" || r === "teacher";
}

/** Search scope: which schools' students may `callerUid` list? */
export function searchableSchools(state, uid) {
  if (!uid) return [];
  if (isPlatformAdmin(state, uid)) return ["*"];
  return Object.values(state.memberships)
    .filter((m) => m.uid === uid && m.status === "active" && ["school_admin", "coordinator", "teacher"].includes(m.role))
    .map((m) => m.schoolId);
}
