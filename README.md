# LockOn Revision

Modern React + Tailwind frontend for a Firebase-backed competitive revision platform.

LockOn Revision uses Firebase Auth and Firestore for user data, Cloudinary for uploads, and Gemini-backed API routes for lesson generation, tutor responses, hints, and explanations.

## Routes

- `/` - Marketing landing page
- `/login` - Firebase email/password authentication
- `/app` - Dashboard, scoring actions, and progress overview
- `/forge` - Cloudinary upload, Gemini curriculum generation, and lesson playback
- `/leaderboard` - Ranked user progress
- `/admin` - User, reward, and Forge moderation tools

## Core Scoring Model

```txt
Total Score = XP + (Energy x 100)
```

## Backend

- `api/` - Vercel API routes for Gemini workflows
- `functions/` - Firebase callable functions
- `backend/` - backend architecture notes

## Run

```bash
npm install
npm run dev
```
