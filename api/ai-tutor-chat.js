import { GoogleGenerativeAI } from '@google/generative-ai';

const geminiApiKey = process.env.GEMINI_API_KEY;
const geminiModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

if (!geminiApiKey) {
  console.warn('GEMINI_API_KEY not set. AI functions will fail.');
}

const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;
const model = genAI ? genAI.getGenerativeModel({ model: geminiModel }) : null;

async function callGeminiStream(prompt) {
  if (!model) throw new Error('Gemini API is not configured.');
  
  const result = await model.generateContentStream(prompt);
  return result.stream;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, context } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Missing required field: messages' });
    }

    const conversation = messages.map((m) => `${m.role === 'user' ? 'Student' : 'Assistant'}: ${m.content}`).join('\n');
    const contextStr = context ? `\n\nSTUDY MATERIAL CONTEXT:\n${JSON.stringify(context, null, 2)}` : '';

    const prompt = `You are the LockOn Revision AI Tutor, a world-class educational assistant specializing in active recall and spaced repetition.
Your goal is to help students master their material through guided learning, not just giving answers.

CAPABILITIES:
1. Explain Concepts: Break down complex ideas into simple, digestible parts. Use analogies.
2. Generate Quizzes: Create challenging active-recall questions (MCQs, Short Answer, True/False) based on the context.
3. Generate Summaries: Provide concise, high-impact summaries of study materials.
4. Homework Help: Guide students to the answer by asking leading questions rather than just providing the solution.
5. Reference Materials: Always prioritize the provided STUDY MATERIAL CONTEXT. If the answer isn't there, state that it's not in the notes but provide a general helpful answer.

STYLE GUIDELINES:
- Be concise, encouraging, and academic yet accessible.
- Use Markdown for formatting (bolding, lists, tables).
- If the student is struggling, offer a simpler explanation.
- End responses with a follow-up question to keep the student engaged.

CONVERSATION HISTORY:
${conversation}${contextStr}

Please provide your response in plain text (Markdown). Do not wrap it in JSON.`;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    const stream = await callGeminiStream(prompt);
    for await (const chunk of stream) {
      const chunkText = chunk.text();
      res.write(chunkText);
    }
    res.end();
  } catch (error) {
    console.error('Error in ai-tutor-chat:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    } else {
      res.write(`\n\n[Error: ${error.message}]`);
      res.end();
    }
  }
}
