# LockOn Revision

Modern React + Tailwind frontend scaffold for a Firebase-backed competitive revision platform.

Firebase is currently unavailable, so runtime Firebase initialization is intentionally disabled. All Firebase-facing files,
services, and backend folders remain in place as TODO scaffolds for later integration.

## Routes

- `/` - Startup-style marketing landing page
- `/login` - Firebase Auth placeholder
- `/app` - Dashboard scaffold
- `/leaderboard` - Leaderboard architecture with loading/empty states only
- `/admin` - Admin capability scaffold

## Core Scoring Model

```txt
Total Score = XP + (Energy x 100)
```

Leaderboard label:

```txt
⚡ 1 Energy = 100 XP
```


## Backend Scaffold

- `functions/` - Cloud Functions scaffold
- `backend/` - backend architecture notes

## Run

```bash
npm install
npm run dev
```
