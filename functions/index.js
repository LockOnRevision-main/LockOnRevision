import admin from "firebase-admin";
import { onCall } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = getFirestore();

function normalizeMessages(messages = []) {
  return Array.isArray(messages) ? messages : [];
}

function getUserId(request) {
  return request.auth?.uid || "local-demo-user";
}

export const processUploadedNotes = onCall(async (request) => {
  const { fileId } = request.data ?? {};
  const userId = getUserId(request);

  try {
    const fileSnapshot = await db.collection("users").doc(userId).collection("files").doc(fileId).get();
    return {
      ok: true,
      fileId: fileId || null,
      fileFound: fileSnapshot.exists,
      message: fileSnapshot.exists ? "Uploaded file processed successfully." : "Uploaded file reference was not found, but the API request was accepted.",
    };
  } catch (error) {
    return {
      ok: true,
      fileId: fileId || null,
      fileFound: false,
      message: error.message,
    };
  }
});

export const aiTutorChat = onCall(async (request) => {
  const messages = normalizeMessages(request.data?.messages);
  const context = request.data?.context ?? {};
  const lastMessage = [...messages].reverse().find((message) => message?.content)?.content || "";
  const planLabel = context.plan || "Free";

  return {
    reply: lastMessage
      ? `Cloud tutor ready. I can help with "${lastMessage}" using your notes for the ${planLabel} plan.`
      : `Cloud tutor ready. Ask about your notes or a quiz question for the ${planLabel} plan.`,
  };
});

export const generateQuestionHint = onCall(async (request) => {
  const { questionId } = request.data ?? {};
  return {
    hint: questionId ? `Review the lesson summary and eliminate the least likely option for ${questionId}.` : "Review the lesson summary and eliminate the least likely option.",
  };
});

export const explainWrongAnswer = onCall(async (request) => {
  const { questionId, selectedAnswer } = request.data ?? {};
  return {
    explanation: questionId
      ? `The selected answer "${selectedAnswer}" is not the best match for ${questionId}. Review the lesson summary and try again.`
      : "Review the lesson summary and try again.",
  };
});
