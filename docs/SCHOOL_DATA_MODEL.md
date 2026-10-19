# School data model foundations (Beta 1.9 Prompt 44 — Stage D)

Naming follows the repo's camelCase collections (`users`, `users_public`).

## schools/{schoolId}
- `name: string` (required), `type: 'academy' | 'external'`,
  `country: string | null`,
  `joinPolicy: 'IMMEDIATE' | 'APPROVAL_REQUIRED'` (default
  `APPROVAL_REQUIRED` — safer; Prompt 45 Stage 3),
  `createdAt`, `updatedAt`, `createdByUid`
- Well-known stable doc: `schools/academy` = LockOnRevision Academy
  (created by the migration; `type: 'academy'`).
- Rules: read = platform admin or active member of that school;
  create = platform admin; update = platform admin or that school's
  `school_admin`; delete = never.

## classrooms/{classroomId} (exactly one school)
- `schoolId: string` (immutable after create), `name: string`,
  `yearGroup: string | null`, `createdAt`, `updatedAt`
- Rules: read = admin or member of `schoolId`; create/update =
  admin or `school_admin`/`coordinator` of that school; delete =
  admin or `school_admin`.

## memberships/{uid_schoolId} (deterministic id)
- Id = `${uid}_${schoolId}` (sanitised) so repeats cannot duplicate.
- `uid`, `schoolId`, `role: school_admin|coordinator|teacher|student`,
  `classroomId: string | null`, `status: active|removed|pending`,
  `createdAt`, `updatedAt`, `removedAt: string | null`, `removedBy: uid | null`
- Removal = `status: 'removed'` + `removedAt` — NEVER deletes
  `users/{uid}` or learning subcollections.
- One UID may hold memberships in many schools.
- Rules: read = admin, owner (`uid == auth.uid`), or school staff;
  create = admin, `school_admin`, or teacher-path for `role == 'student'`;
  update = admin or `school_admin`; delete = never.

## staffAssignments/{assignmentId}
- Explicit scoped staff record: `uid`, `schoolId`, `classroomId | null`,
  `role: school_admin|coordinator|teacher`, `status`, timestamps.
- Kept separate from memberships so staff scope (school/classroom) is
  auditable independently. Rules mirror memberships management.

## adminAuditLogs/{autoId} (append-only, server-only)
- `actorUid`, `action` (e.g. `admin.bootstrap`, `membership.revoke`,
  `migration.run`), `targetUid | null`, `schoolId | null`, `scope`,
  `createdAt` (ISO), `note`. NEVER secrets or excess personal data.
- Rules: read = platform admin; create/update/delete = `false` for all
  clients (writes only via Admin SDK which bypasses rules).

## Joining PINs / requests — IMPLEMENTED (Prompt 45)

- `joiningPins/pin_<hash32>`: `{ codeHash (HMAC-SHA256 + PIN_PEPPER, never
  plaintext), schoolId, classroomId|null, status: active|revoked|expired,
  expiresAt, useCount, createdBy, createdAt, revokedAt|null, revokedBy|null }`.
  Doc id is deterministic from the hash (global uniqueness + O(1) lookup).
  Server-only via Admin SDK; Firestore rules deny all client access.
- `joinRequests/req_<uid>_<school>_<class|school>`: `{ uid, schoolId,
  classroomId|null, status: pending|approved|rejected, pinId, createdAt,
  decidedBy|null, decidedAt|null }`. Transitions pending→approved|rejected
  only. Server-only; rules deny clients.
- `pinAttempts/{uid}`: `{ count, windowStart, lockUntil|null }` —
  Firestore-backed redemption lockout (10 failures / 15 min). Server-only.
- `adminInvitations/inv_<hash32>` — IMPLEMENTED (Beta 2.0 Part 1):
  `{ schoolId, emailLower, role: 'school_admin', tokenHash (HMAC+INVITE_PEPPER),
  status: pending|used|revoked, expiresAt (7d), createdBy, createdAt,
  resendCount, resends|null, usedAt|null, usedBy|null, revokedAt|null,
  revokedBy|null }`. Server-only via Admin SDK; rules deny all clients.

## users_public additions (Prompt 45 Stage 1)

- New field `searchName` (lowercased name) for documented prefix search.
  Projection stays leaderboard-safe: never email/isAdmin/role.

## Granular permissions (Beta 2.0 Part 1 — Stage 2, IMPLEMENTED)

- Single source: `shared/permissionsCatalogue.js` (v1, 19 permissions).
  Backend (`server/lib/schoolServer.js`) and UI (`src/utils/schoolPermissions.js`)
  derive from it; legacy dotted names map via `LEGACY_PERMISSION_MAP`.
- Overrides live on `memberships/{uid_school}`:
  `permissionSet: { grants: [], denies: [] }`,
  `accessScopes: 'all' | [classroomIds]`.
  Effective = (role defaults ∪ grants) − denies; absent == Beta 1.9 defaults.
- Firestore rules deny ALL client writes of
  `permissionSet/accessScopes/permissionSets` (escalation hole closed);
  only the Admin SDK path (`POST /api/set-permissions`) may change them.
- `staffAssignments/*` remains the assignment ledger (role/scope at grant).

## Indexes (firestore.indexes.json)
- `users_public(totalScore DESC)` — leaderboard query.
- `memberships(uid,status)` + `(schoolId,status)` + `(uid,schoolId)` +
  `(schoolId,status,role)` — revocation lookups, rosters, scoped search.
- `joiningPins(schoolId,status)` + `joinRequests(schoolId,status)` —
  staff PIN/request lists in school-overview.
- `classrooms(schoolId,name)` — per-school classroom lists.
- `staffAssignments(schoolId,role)` — staff rosters.
- `adminAuditLogs(createdAt DESC)` — recent-action review.
