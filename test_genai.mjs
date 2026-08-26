process.env.GEMINI_API_KEY = 'AIzaSyBzC4rVXjHzHJ3rSjvhD7KLmNqPoRstuVW';
process.env.CLOUDINARY_CLOUD_NAME = 'duhn66q7t';
process.env.CLOUDINARY_API_KEY = 'test';
process.env.CLOUDINARY_API_SECRET = 'test';

import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
console.log('GoogleGenAI initialized:', !!ai);