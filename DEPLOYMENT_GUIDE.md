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
VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_unsigned_upload_preset
```

## Server Environment

Set these in Vercel project settings (Settings → Environment Variables):

```bash
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-1.5-flash
```

**⚠️ Required:** The AI Assistant and all AI features require `GEMINI_API_KEY` to be set. Without it, the AI Assistant will show a friendly message indicating it's not configured, and Forge generation will use fallback local content generation.

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
