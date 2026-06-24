export function hasGeminiKey() {
  return true;
}

export function getGeminiModel() {
  return "gemini-1.5-flash";
}

function parseGeminiJson(text) {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

export async function callGeminiJson(prompt, fallbackValue = null) {
  try {
    const response = await fetch('/api/generate-learning-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceText: prompt }),
    });

    if (!response.ok) {
      if (fallbackValue !== null) return fallbackValue;
      throw new Error(`API request failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Vercel API error:", error);
    if (fallbackValue !== null) return fallbackValue;
    throw error;
  }
}

export async function callGeminiText(prompt, fallbackText = "") {
  try {
    const response = await fetch('/api/ai-tutor-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
    });

    if (!response.ok) {
      if (fallbackText) return fallbackText;
      throw new Error(`API request failed: ${response.status}`);
    }

    const result = await response.json();
    return result.reply || fallbackText;
  } catch (error) {
    console.error("Vercel API error:", error);
    if (fallbackText) return fallbackText;
    throw error;
  }
}
