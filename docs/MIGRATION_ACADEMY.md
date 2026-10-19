# Academy migration — runbook (Beta 1.9 Prompt 44 — Stage E)

Target project: `lockonrevision-f741c` (Spark plan).

## Pre-flight (required before any --apply)

1. Export a Firestore backup: Firebase console → Firestore → Export/Import
   (or `gcloud firestore export`). Record the export path + timestamp.
   On Spark, scheduled exports may be unavailable — do a manual export and
   note its limits in the run log.
2. Confirm the owner's admin: `users/{ownerUid}` has `isAdmin: true` or
   `role: 'admin'` (see `docs/ADMIN_RECOVERY.md`).
3. Deploy the new `firestore.rules` + `firestore.indexes.json` first so
   `memberships`/`schools` writes are governed during migration.

## Dry-run (default, no writes)

```bash
export FIREBASE_PROJECT_ID="lockonrevision-f741c"
export FIREBASE_CLIENT_EMAIL="..."
export FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n"
node scripts/migrate-academy.mjs --dry-run
```

Reports `{ eligibleUsers, alreadyMigrated, toCreate }` + sample ids.

## Apply (owner only)

```bash
node scripts/migrate-academy.mjs --apply --batch 200
# resume after interruption:
node scripts/migrate-academy.mjs --apply --resume-after <LAST_UID>
# limit a canary batch:
node scripts/migrate-academy.mjs --apply --limit 10
```

Idempotent: re-runs skip existing `memberships/{uid}_academy` docs.
Batched ≤450 with 1s pauses (Spark quota-aware). Appends
`adminAuditLogs(action: migration.run, createdIds: [...])`.

## Reconcile

```bash
node scripts/migrate-academy.mjs --reconcile
```

Compares eligible `users/*` count vs `memberships(schoolId==academy)`
count; lists up to 20 unmatched UIDs (no personal data). Re-run `--apply`
until `missing: 0`. Learning data is untouched — verify by spot-checking
`users/{uid}` xp/energy/totalScore before/after.

## Rollback

```bash
node scripts/migrate-academy.mjs --rollback-list
```

Lists membership ids created by migration runs (from the audit record).
Rollback = delete ONLY those `memberships/*` docs (console or Admin SDK).
Never delete `users/*` or subcollections. Academy school doc
`schools/academy` may remain (harmless) or be left in place for audit.

## New registrations

`AuthContext` calls `POST /api/enroll-academy` (verified ID token,
self-only, `role: student`, rate-limited 5/min) after first profile
creation, so post-migration sign-ups join Academy automatically.
Registration works even if enrolment is temporarily unavailable (best-effort).

## Emulator test (representative data + edge cases)

```bash
# with FIRESTORE_EMULATOR_HOST set and seed users (missing fields,
# already-migrated, interrupted runs), run:
node scripts/migrate-academy.mjs --dry-run   # expect 0 writes
node scripts/migrate-academy.mjs --apply
node scripts/migrate-academy.mjs --apply      # 2nd run: 0 created
node scripts/migrate-academy.mjs --reconcile  # counts match
```

Covered by `tests/migration.test.mjs` (pure logic) — emulator runs are
manual until CI provides the emulator.
