# Emulator rules tests (Stage 0.1 — Beta 2.0)

## What runs where

- **CI (`emulator-tests` job):** REAL proof. `firebase emulators:exec --only
  firestore,storage "npm run test:emulator" --project demo-lor` executes
  `tests/emulator/rules.test.mjs` (Firestore isolation, escalation denial,
  server-only collections) and `tests/emulator/storage.test.mjs`
  (deny-by-default) against the actual `firestore.rules` / `storage.rules`
  text. Java 17 via `setup-java`.
- **Local:** `tests/school-isolation.test.mjs` is a MIRROR (rule-logic
  re-implementation, clearly labelled). It runs everywhere without an
  emulator but proves intent, not the rules file. If mirror and emulator
  ever disagree, the emulator governs (P1 bug in the mirror).

## Run locally (requires Java 11+)

```bash
cd LockOnRevision
firebase emulators:exec --only firestore,storage "npm run test:emulator" --project demo-lor
```

Or long-lived: `firebase emulators:start --only firestore,storage`, then in
another shell `npm run test:emulator` with
`FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` set (exec sets it automatically).

## Seeding

Tests self-seed via `withSecurityRulesDisabled` in `before()` and
`clearFirestore()` first — no fixtures, no production data, project
`demo-lor` (never a real project id).
