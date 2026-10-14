# Deployment Guide

## Required Services

- Firebase Auth for email/password authentication
- Firestore for users, subjects, units, sub-units, lessons, questions, answers, and admin data
- Cloudinary unsigned upload preset for browser uploads
- Vercel API routes for Gemini requests

## Frontend Environment

Set these in `.env.local` and in your hosting provider:

```bash
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_unsigned_upload_preset
```

> **Admin access:** Admin status is determined by the `isAdmin`/`role` field on the user's Firestore document. Grant admin by setting `isAdmin: true` on a user document in the Firebase console (or via the Cloud Functions admin SDK) — there is no email-list override.


## Server Environment

Set these in Vercel project settings (Settings → Environment Variables):

```bash
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-1.5-flash
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_PROJECT_ID=your_project_id
PIN_PEPPER=your_random_32plus_char_secret
```

> **PIN_PEPPER (Beta 1.9 school joining):** a long random server secret
> (≥16 chars, 32+ recommended) used as the HMAC key for joining-PIN hashes.
> Required for `create-pin`/`redeem-pin`; both fail closed (generic 500)
> when it is missing or short. Generate once per environment, store only
> in Vercel env vars, never commit it.
>
> **Rotation (never silent):** rotating the pepper instantly invalidates all
> unredeemed PINs by design (hashes no longer match). Procedure: (1) announce
> to school staff that active PINs will be replaced; (2) revoke active PINs
> via the Admin Panel (Schools tab) or let short-lived ones expire;
> (3) set the new `PIN_PEPPER` in Vercel and redeploy; (4) regenerate PINs
> and distribute the new ones. Each step is audited (`pin.revoke`,
> `pin.create`). The same procedure applies to `INVITE_PEPPER` (Beta 2.0
> invitations).
>
> **Beta 2.0 invitations (optional email):**
> `INVITE_PEPPER` (same rules as `PIN_PEPPER`, separate value), plus for
> emailed invitations: `RESEND_API_KEY` (Resend free: 3,000/mo, 100/day),
> `INVITE_FROM_EMAIL` (verified sender, e.g. `LOR Admin <admin@your.domain>`),
> `PUBLIC_APP_URL` (canonical app origin for accept links, e.g.
> `https://your.app`). Without email keys the flow still works via the
> copy-link fallback the platform administrator transmits manually.

**⚠️ Required:** The AI Assistant and all AI features require `GEMINI_API_KEY` to be set. Without it, the AI Assistant will show a friendly message indicating it's not configured, and Forge generation will use fallback local content generation. The `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` values are required for Firebase Admin SDK authentication in serverless API routes — obtain them from your Firebase project's Service Account settings.

## Development

### Running locally

```bash
npm install
npm run dev
```

In development mode, API routes are proxied to `http://127.0.0.1:3000`. To test AI features locally, you need a local server on port 3000 that handles the API routes.

Alternatively, deploy to Vercel and test against production:

```bash
vercel --prod
```

## Deploy

```bash
npm install
npm run lint
npm run build
vercel --prod
```

## API Routes

- `/api/generate-forge-structure`
- `/api/generate-learning-content`
- `/api/ai-tutor-chat`
- `/api/generate-question-hint`
- `/api/explain-wrong-answer`
- `/api/ask-forge-assistant`
- `/api/process-uploaded-notes`

## Verification

- Register and sign in with Firebase Auth.
- Upload a file in Forge and confirm the file document contains Cloudinary metadata.
- Generate Forge content and verify the Subject -> Unit -> Subunit -> Lesson hierarchy.
- Start and complete a lesson, then confirm XP, completion, and progress update in Firestore.
- Open the dashboard, leaderboard, admin page, and Forge assistant without console errors.
