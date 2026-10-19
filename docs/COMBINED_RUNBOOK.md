# Combined owner runbook: users_public backfill + Academy migration (Prompt 45 — Stage 1)

Both operations are additive, idempotent, dry-run by default, and must run
in the SAME maintenance window, in the order below. DO NOT run either
against production without completing the pre-flight.

Target project: `lockonrevision-f741c` (Spark: 50K reads / 20K writes /
20K deletes per day — both scripts batch ≤450 with 1s pauses).

## 0. Pre-flight (once)

1. Manual Firestore export (console → Export/Import); record path + time.
2. Confirm owner admin: `users/{ownerUid}` has `isAdmin: true` or
   `role: 'admin'` (`docs/ADMIN_RECOVERY.md`).
3. Deploy latest `firestore.rules` + `firestore.indexes.json` + `storage.rules`.
4. Set service credentials on a trusted machine only (never commit):
   `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.

## 1. users_public backfill (FIRST — leaderboards depend on it)

```bash
node scripts/backfill-users-public.mjs --dry-run
node scripts/backfill-users-public.mjs --apply --batch 200
node scripts/backfill-users-public.mjs --reconcile   # expect missing: 0
```

Verify: `users_public` count == `users` count; spot-check 3 docs contain
only allowlisted fields (no email/isAdmin/role). Rollback (only if needed):
delete ONLY the ids in the `users-public.backfill` audit entry's
`createdIds`; `users/*` are untouched.

## 2. Academy migration (SECOND — enrolment calls ensure projection)

```bash
node scripts/migrate-academy.mjs --dry-run
node scripts/migrate-academy.mjs --apply --batch 200
node scripts/migrate-academy.mjs --reconcile        # expect missing: 0
```

Verify: `memberships(schoolId==academy)` count == eligible `users` count;
spot-check a student `users/{uid}` xp/energy/totalScore unchanged.
Rollback: `--rollback-list`, delete ONLY those `memberships/*` docs.

## 3. Post-window verification (non-admin account)

1. Sign in as a plain student: dashboard, leaderboard, Forge, timetables,
   XP/Energy increments, and Admin Panel denial all behave as before.
2. `POST /api/enroll-academy` for a new test user returns `ok: true` and
   creates both membership + `users_public` docs plus one
   `membership.self-enrol` audit entry.
3. Admin Panel as owner: platform analytics + user analytics unchanged.

## Why this order

The migration's enrolment path upserts `users_public`; running the backfill
first means the migration only tops up deltas, and reconciliation of each
step is independent (counts comparable separately).
