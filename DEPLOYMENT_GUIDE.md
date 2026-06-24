# AI Architecture Security Refactor - Deployment Guide

## Overview

This project has been refactored to move all AI API calls from the frontend to secure Vercel Serverless Functions. The frontend no longer contains any API keys or secrets.

## Architecture Changes

### Before (Insecure)
```
React Frontend
      │
      ├── Direct Gemini API calls (VITE_GEMINI_API_KEY exposed)
      └── Direct Cloudinary API calls (if any)
```

### After (Secure)
```
React Frontend
      │
      ▼
Vercel Serverless Functions
      │
      ├── Gemini API (GEMINI_API_KEY stored securely)
      └── Cloudinary API (if needed, stored securely)
```

## Files Changed

### Frontend Files Updated
1. **src/services/geminiService.js** - Removed direct API calls, now uses Vercel API routes
2. **src/services/learningService.js** - Removed duplicate Gemini code, uses Vercel API routes
3. **src/services/forgeService.js** - Updated to use Vercel API routes for structure generation
4. **src/services/aiChatService.js** - Updated to use Vercel API routes
5. **src/pages/ForgePage.jsx** - Removed API key warning message

### Backend Files Created (Vercel API Routes)
1. **api/generate-forge-structure.js** - Forge structure generation
2. **api/generate-learning-content.js** - Learning content generation
3. **api/ai-tutor-chat.js** - AI tutor chat
4. **api/generate-question-hint.js** - Question hint generation
5. **api/explain-wrong-answer.js** - Wrong answer explanation
6. **api/ask-forge-assistant.js** - Forge AI assistant
7. **api/process-uploaded-notes.js** - File processing

## Secrets Required

### Vercel Environment Variables

You need to set these secrets in your Vercel project:

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add the following variables:

```
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash
```

Or use Vercel CLI:
```bash
vercel env add GEMINI_API_KEY
vercel env add GEMINI_MODEL
```

### Frontend Environment Variables (Safe to Keep)

These are Firebase client configuration keys (public, not secret):
- `VITE_FIREBASE_API_KEY` - Firebase public API key (safe)
- `VITE_FIREBASE_AUTH_DOMAIN` - Firebase auth domain (safe)
- `VITE_FIREBASE_PROJECT_ID` - Firebase project ID (safe)
- `VITE_FIREBASE_STORAGE_BUCKET` - Firebase storage bucket (safe)
- `VITE_FIREBASE_MESSAGING_SENDER_ID` - Firebase messaging sender ID (safe)
- `VITE_FIREBASE_APP_ID` - Firebase app ID (safe)

### REMOVE from Frontend .env

Remove these from your frontend `.env` file:
- `VITE_GEMINI_API_KEY` - **DELETE** (now in Cloud Functions)
- `VITE_GEMINI_MODEL` - **DELETE** (now in Cloud Functions)

## Deployment Steps

### 1. Set Vercel Environment Variables

```bash
# Using Vercel CLI
vercel env add GEMINI_API_KEY
# Enter your Gemini API key when prompted

vercel env add GEMINI_MODEL
# Enter "gemini-1.5-flash" or your preferred model
```

Or set them in the Vercel dashboard:
1. Go to your Vercel project
2. Settings → Environment Variables
3. Add `GEMINI_API_KEY` and `GEMINI_MODEL`

### 2. Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install @google/generative-ai for API routes
npm install @google/generative-ai
```

### 3. Deploy to Vercel

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Deploy to Vercel
vercel

# Or deploy to production
vercel --prod
```

### 4. Local Development

```bash
# Run locally with Vercel
vercel dev

# The API routes will be available at:
# http://localhost:3000/api/...
```

## Vercel API Routes Created

### 1. `/api/generate-forge-structure`
- **Purpose**: Generate structured learning paths from uploaded materials
- **Method**: POST
- **Input**: `{ sourceText: string, sourceFileIds?: string[] }`
- **Output**: JSON structure with subject, units, sub-units, and lessons

### 2. `/api/generate-learning-content`
- **Purpose**: Generate active-recall learning content with questions
- **Method**: POST
- **Input**: `{ sourceText: string }`
- **Output**: JSON structure with subjects, units, lessons, and questions

### 3. `/api/ai-tutor-chat`
- **Purpose**: AI tutor chat functionality
- **Method**: POST
- **Input**: `{ messages: Array<{role, content}>, context?: object }`
- **Output**: `{ reply: string }`

### 4. `/api/generate-question-hint`
- **Purpose**: Generate hints for quiz questions
- **Method**: POST
- **Input**: `{ questionId: string }` or `{ question: object }`
- **Output**: `{ hint: string }`

### 5. `/api/explain-wrong-answer`
- **Purpose**: Explain why an answer is wrong
- **Method**: POST
- **Input**: `{ question: object, selectedAnswer: string }`
- **Output**: `{ explanation: string }`

### 6. `/api/ask-forge-assistant`
- **Purpose**: AI assistant for Forge-generated content
- **Method**: POST
- **Input**: `{ messages: Array<{role, content}>, subjects: array }`
- **Output**: `{ reply: string }`

### 7. `/api/process-uploaded-notes`
- **Purpose**: Process uploaded files and generate learning content
- **Method**: POST
- **Input**: `{ sourceText: string }`
- **Output**: `{ ok: boolean, data: object }`

## Security Features Implemented

1. **No API Keys in Frontend**: All secrets moved to Vercel environment variables
2. **Input Validation**: All API routes validate required input fields
3. **Error Handling**: Proper error messages without exposing sensitive information
4. **Server-Side Execution**: All AI calls happen on the server, never in the browser
5. **Environment Variable Protection**: Secrets are encrypted and never exposed
6. **Rate Limiting Ready**: Structure supports adding rate limiting with Vercel

## Testing Checklist

- [ ] Vercel project deployed successfully
- [ ] Environment variables configured correctly
- [ ] Forge generation works with uploaded files
- [ ] Forge generation works with pasted notes
- [ ] Learning content generation works
- [ ] AI Tutor chat works
- [ ] Question hints work
- [ ] Wrong answer explanations work
- [ ] Forge assistant works
- [ ] File upload and processing works
- [ ] No API keys exposed in browser console
- [ ] No API keys in frontend code

## Troubleshooting

### API routes return errors
- Check that GEMINI_API_KEY is set in Vercel environment variables
- Verify the API key is valid
- Check Vercel function logs in the dashboard
- Ensure @google/generative-ai is installed

### Frontend can't call API routes
- Verify Vercel dev server is running: `vercel dev`
- Check browser console for errors
- Verify API routes are accessible at `/api/...`
- Check network tab in browser dev tools

### Local development
- Use Vercel dev: `vercel dev`
- Set environment variables in `.env.local` for local testing
- The frontend will use local fallbacks if API routes fail

## Monitoring

Monitor your Vercel API routes usage:
- Check Vercel dashboard for function logs
- Monitor execution time and memory usage
- Track API route invocations
- Set up alerts for error rates

Check Vercel Analytics for:
- Request counts
- Response times
- Error rates
- Geographic distribution

## Cost Considerations

- Vercel has generous free tier limits for serverless functions
- Gemini API calls incur costs based on usage
- Monitor usage in Vercel dashboard and Google Cloud Console
- Consider implementing rate limiting for production
- Vercel charges based on execution time and memory

## Future Enhancements

1. **Rate Limiting**: Add per-user rate limiting with Vercel Edge Config
2. **Caching**: Cache common AI responses with Vercel KV
3. **Analytics**: Track AI usage patterns with Vercel Analytics
4. **Cost Controls**: Implement daily usage limits per user
5. **Fallback Strategies**: Improve local fallbacks when backend is unavailable
6. **Authentication**: Add Firebase Auth middleware to API routes
