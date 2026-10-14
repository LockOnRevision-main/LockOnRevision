# Admin bootstrap & recovery (Beta 1.9 Prompt 44 — Stage B)

No secrets are stored in this repository. All commands run on the project
owner's machine with service-account credentials exported as environment
variables (never committed).

## How the first admin is created

Before Beta 1.9, admin status was granted by manually editing
`users/{uid}` in the Firebase console (`isAdmin: true`). That path still
works but is now scripted and audited:

```bash
export FIREBASE_PROJECT_ID="lockonrevision-f741c"
export FIREBASE_CLIENT_EMAIL="...iam.gserviceaccount.com"
export FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n"
node scripts/admin-bootstrap.mjs --uid <FIREBASE_UID>
# dry-run output only. To write:
node scripts/admin-bootstrap.mjs --uid <FIREBASE_UID> --apply
# or by email:
node scripts/admin-bootstrap.mjs --email owner@example.com --apply
```

The script (operator-only, Admin SDK) merge-sets
`{ isAdmin: true, role: 'admin' }` and appends an `adminAuditLogs` entry
(`action: admin.bootstrap`, `actorUid: operator`). It never demotes
existing admins and is idempotent.

## Recovery (locked out)

1. Export the service-account env vars above on a trusted machine.
2. Run the bootstrap command with `--apply` for the owner's UID/email.
3. Verify: read `users/{uid}` shows `isAdmin: true`, and
   `adminAuditLogs` contains the new `admin.bootstrap` entry.
4. Sign out/in to refresh the ID token, then open the Admin Panel.

There is deliberately NO public endpoint, client write, or email allow-list
that can grant admin — recovery requires the Firebase service credential.

## Safety with tightened rules

- `firestore.rules` `isAdmin()` accepts `isAdmin == true` OR `role == 'admin'`,
  so pre-existing admins (either field) keep access after deploy.
- Verify before enforcing: run the dry-run above and confirm the owner's
  profile already has one of those fields.
