import {
  addDoc,
  collection,
  doc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "../config/firebase.js";
import { getLocalUser, makeId, subscribeLocalState, updateLocalUser } from "./localStore.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

function localList(uid, name) {
  return getLocalUser(uid)?.[name] || [];
}

function sortByUpdated(items) {
  return [...items].sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
}

function emitLocalCollection(uid, name, callback) {
  return subscribeLocalState(() => {
    const items = localList(uid, name);
    if (name === "questions") {
      callback(sortByUpdated(items.filter((item) => Number(item.mastery || 0) < 70)).slice(0, 20));
      return;
    }
    callback(sortByUpdated(items).slice(0, name === "lessons" ? 24 : undefined));
  });
}

function splitSentences(text) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 28);
}

function titleFromText(text, fallback) {
  const firstLine = text
    .split(/\n+/)
    .map((line) => line.trim())
    .find(Boolean);
  return (firstLine || fallback || "Uploaded Notes").slice(0, 72);
}

function buildLocalCourse(uid, sourceText, sourceFileId = null) {
  const now = new Date().toISOString();
  const cleanText = sourceText.trim() || "Active recall revision notes. Add clearer notes for better generated questions.";
  const sentences = splitSentences(cleanText);
  const chunks = [];
  for (let index = 0; index < Math.max(1, sentences.length); index += 4) {
    chunks.push(sentences.slice(index, index + 4));
  }
  const selectedChunks = chunks.slice(0, 6);

  const subject = {
    id: makeId("subject"),
    title: titleFromText(cleanText, "My Notes"),
    description: "Generated locally from your notes.",
    unitCount: Math.max(1, Math.ceil(selectedChunks.length / 2)),
    sourceFileId,
    createdAt: now,
    updatedAt: now,
  };

  const units = [];
  const lessons = [];
  const questions = [];

  selectedChunks.forEach((chunk, index) => {
    const unitIndex = Math.floor(index / 2) + 1;
    let unit = units.find((item) => item.title === `Unit ${unitIndex}`);
    if (!unit) {
      unit = {
        id: makeId("unit"),
        subjectId: subject.id,
        subjectName: subject.title,
        title: `Unit ${unitIndex}`,
        summary: chunk[0] || "Core ideas from your notes.",
        sourceFileId,
        createdAt: now,
        updatedAt: now,
      };
      units.push(unit);
    }

    const lessonText = chunk.join(" ");
    const lesson = {
      id: makeId("lesson"),
      subjectId: subject.id,
      unitId: unit.id,
      subjectName: subject.title,
      unitName: unit.title,
      title: chunk[0]?.replace(/[.!?]$/, "").slice(0, 64) || `Lesson ${index + 1}`,
      summary: lessonText || "Review the main idea and test yourself.",
      keyPoints: chunk.slice(0, 4),
      mastery: 45,
      difficulty: index > 2 ? "hard" : index > 0 ? "medium" : "easy",
      sourceFileId,
      createdAt: now,
      updatedAt: now,
    };
    lessons.push(lesson);

    const answer = chunk[0] || lesson.title;
    questions.push({
      id: makeId("question"),
      subjectId: subject.id,
      unitId: unit.id,
      lessonId: lesson.id,
      subjectName: subject.title,
      unitName: unit.title,
      lessonTitle: lesson.title,
      prompt: `Which statement best captures this lesson: "${lesson.title}"?`,
      options: [
        answer,
        "It is unrelated to the uploaded notes.",
        "It only describes formatting, not meaning.",
        "It says revision is unnecessary.",
      ],
      correctAnswer: answer,
      explanation: `The correct answer is taken directly from the lesson summary: ${answer}`,
      topic: lesson.title,
      difficulty: lesson.difficulty,
      mastery: 45,
      attempts: 0,
      correctAttempts: 0,
      sourceFileId,
      createdAt: now,
      updatedAt: now,
    });
  });

  updateLocalUser(uid, (userData) => ({
    ...userData,
    subjects: [subject, ...userData.subjects],
    units: [...units, ...userData.units],
    lessons: [...lessons, ...userData.lessons],
    questions: [...questions, ...userData.questions],
    profile: {
      ...userData.profile,
      dailyUsage: {
        ...userData.profile.dailyUsage,
        aiRequests: Number(userData.profile.dailyUsage?.aiRequests || 0) + 1,
        uploadsProcessed: Number(userData.profile.dailyUsage?.uploadsProcessed || 0) + 1,
      },
    },
  }));

  return { subject, units, lessons, questions };
}

function fallbackCourseJson(sourceText) {
  const cleanText = sourceText.trim() || "Active recall revision notes.";
  const sentences = splitSentences(cleanText);
  const chunks = [];
  for (let index = 0; index < Math.max(1, sentences.length); index += 4) {
    chunks.push(sentences.slice(index, index + 4));
  }

  return {
    subjects: [
      {
        title: titleFromText(cleanText, "My Notes"),
        description: "Generated from your notes.",
        units: chunks.slice(0, 3).map((chunk, index) => ({
          title: `Unit ${index + 1}`,
          summary: chunk[0] || "Core ideas from your notes.",
          lessons: [
            {
              title: (chunk[0] || `Lesson ${index + 1}`).replace(/[.!?]$/, "").slice(0, 64),
              summary: chunk.join(" ") || "Review the main idea and test yourself.",
              difficulty: index > 1 ? "hard" : index > 0 ? "medium" : "easy",
              keyPoints: chunk.slice(0, 4),
              questions: [
                {
                  prompt: `Which statement best captures this lesson?`,
                  options: [
                    chunk[0] || "The main idea from the notes.",
                    "It is unrelated to the uploaded notes.",
                    "It only describes formatting, not meaning.",
                    "It says revision is unnecessary.",
                  ],
                  correctAnswer: chunk[0] || "The main idea from the notes.",
                  explanation: "The correct answer is grounded in the notes you provided.",
                  topic: chunk[0] || "Main idea",
                  difficulty: index > 1 ? "hard" : index > 0 ? "medium" : "easy",
                },
              ],
            },
          ],
        })),
      },
    ],
  };
}

function writeGeminiCourse(uid, generated, sourceFileId = null) {
  const now = new Date().toISOString();
  const subjects = [];
  const units = [];
  const lessons = [];
  const questions = [];

  (generated.subjects || []).forEach((subjectInput) => {
    const subject = {
      id: makeId("subject"),
      title: subjectInput.title || "Generated Subject",
      description: subjectInput.description || "Generated by Gemini from your notes.",
      unitCount: subjectInput.units?.length || 0,
      sourceFileId,
      createdAt: now,
      updatedAt: now,
    };
    subjects.push(subject);

    (subjectInput.units || []).forEach((unitInput) => {
      const unit = {
        id: makeId("unit"),
        subjectId: subject.id,
        subjectName: subject.title,
        title: unitInput.title || "Generated Unit",
        summary: unitInput.summary || "",
        sourceFileId,
        createdAt: now,
        updatedAt: now,
      };
      units.push(unit);

      (unitInput.lessons || []).forEach((lessonInput) => {
        const lesson = {
          id: makeId("lesson"),
          subjectId: subject.id,
          unitId: unit.id,
          subjectName: subject.title,
          unitName: unit.title,
          title: lessonInput.title || "Generated Lesson",
          summary: lessonInput.summary || "",
          keyPoints: lessonInput.keyPoints || [],
          mastery: 45,
          difficulty: lessonInput.difficulty || "medium",
          sourceFileId,
          createdAt: now,
          updatedAt: now,
        };
        lessons.push(lesson);

        (lessonInput.questions || []).forEach((questionInput) => {
          const options = Array.isArray(questionInput.options) ? questionInput.options.slice(0, 4) : [];
          questions.push({
            id: makeId("question"),
            subjectId: subject.id,
            unitId: unit.id,
            lessonId: lesson.id,
            subjectName: subject.title,
            unitName: unit.title,
            lessonTitle: lesson.title,
            prompt: questionInput.prompt || `What is the key idea in ${lesson.title}?`,
            options,
            correctAnswer: questionInput.correctAnswer || options[0],
            explanation: questionInput.explanation || "",
            topic: questionInput.topic || lesson.title,
            difficulty: questionInput.difficulty || lesson.difficulty,
            mastery: 45,
            attempts: 0,
            correctAttempts: 0,
            sourceFileId,
            createdAt: now,
            updatedAt: now,
          });
        });
      });
    });
  });

  if (!subjects.length || !questions.length) {
    return buildLocalCourse(uid, "Gemini returned too little content. Please paste clearer notes.", sourceFileId);
  }

  updateLocalUser(uid, (userData) => ({
    ...userData,
    subjects: [...subjects, ...userData.subjects],
    units: [...units, ...userData.units],
    lessons: [...lessons, ...userData.lessons],
    questions: [...questions, ...userData.questions],
    profile: {
      ...userData.profile,
      dailyUsage: {
        ...userData.profile.dailyUsage,
        aiRequests: Number(userData.profile.dailyUsage?.aiRequests || 0) + 1,
        uploadsProcessed: Number(userData.profile.dailyUsage?.uploadsProcessed || 0) + 1,
      },
    },
  }));

  return { subjects, units, lessons, questions };
}

async function buildGeminiCourse(uid, sourceText, sourceFileId = null) {
  if (!isFirebaseConfigured) {
    return buildLocalCourse(uid, sourceText, sourceFileId);
  }

  try {
    const response = await fetch('/api/generate-learning-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceText }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const generated = await response.json();
    return generated ? writeGeminiCourse(uid, generated, sourceFileId) : buildLocalCourse(uid, sourceText, sourceFileId);
  } catch (error) {
    console.error("Vercel API error:", error);
    return buildLocalCourse(uid, sourceText, sourceFileId);
  }
}

async function writeFirebaseCourse(uid, generated, sourceFileId = null) {
  const created = {
    subjects: [],
    units: [],
    lessons: [],
    questions: [],
  };

  for (const subjectInput of generated.subjects || []) {
    const subjectRef = await addDoc(collection(db, "users", uid, "subjects"), {
      title: subjectInput.title || "Generated Subject",
      description: subjectInput.description || "Generated from your notes.",
      unitCount: subjectInput.units?.length || 0,
      sourceFileId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    created.subjects.push(subjectRef.id);

    for (const unitInput of subjectInput.units || []) {
      const unitRef = await addDoc(collection(db, "users", uid, "units"), {
        subjectId: subjectRef.id,
        subjectName: subjectInput.title || "Generated Subject",
        title: unitInput.title || "Generated Unit",
        summary: unitInput.summary || "",
        sourceFileId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      created.units.push(unitRef.id);

      for (const lessonInput of unitInput.lessons || []) {
        const lessonRef = await addDoc(collection(db, "users", uid, "lessons"), {
          subjectId: subjectRef.id,
          unitId: unitRef.id,
          subjectName: subjectInput.title || "Generated Subject",
          unitName: unitInput.title || "Generated Unit",
          title: lessonInput.title || "Generated Lesson",
          summary: lessonInput.summary || "",
          keyPoints: lessonInput.keyPoints || [],
          mastery: 45,
          difficulty: lessonInput.difficulty || "medium",
          sourceFileId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        created.lessons.push(lessonRef.id);

        for (const questionInput of lessonInput.questions || []) {
          const options = Array.isArray(questionInput.options) ? questionInput.options.slice(0, 4) : [];
          const questionRef = await addDoc(collection(db, "users", uid, "questions"), {
            subjectId: subjectRef.id,
            unitId: unitRef.id,
            lessonId: lessonRef.id,
            subjectName: subjectInput.title || "Generated Subject",
            unitName: unitInput.title || "Generated Unit",
            lessonTitle: lessonInput.title || "Generated Lesson",
            prompt: questionInput.prompt || `What is the key idea in ${lessonInput.title || "this lesson"}?`,
            options,
            correctAnswer: questionInput.correctAnswer || options[0],
            explanation: questionInput.explanation || "",
            topic: questionInput.topic || lessonInput.title || "Generated Lesson",
            difficulty: questionInput.difficulty || lessonInput.difficulty || "medium",
            mastery: 45,
            attempts: 0,
            correctAttempts: 0,
            sourceFileId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          created.questions.push(questionRef.id);
        }
      }
    }
  }

  await updateDoc(doc(db, "users", uid), {
    "dailyUsage.aiRequests": increment(1),
    "dailyUsage.uploadsProcessed": increment(1),
    updatedAt: serverTimestamp(),
  });

  return created;
}

async function buildFirebaseGeminiCourse(uid, sourceText, sourceFileId = null) {
  try {
    const response = await fetch('/api/generate-learning-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceText }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const generated = await response.json();
    return writeFirebaseCourse(uid, generated, sourceFileId);
  } catch (error) {
    console.error("Vercel API error:", error);
    const generated = fallbackCourseJson(sourceText);
    return writeFirebaseCourse(uid, generated, sourceFileId);
  }
}

export function subscribeUserCollection(uid, name, callback, constraints = []) {
  if (!isFirebaseConfigured) {
    return emitLocalCollection(uid, name, callback);
  }
  return onSnapshot(query(collection(db, "users", uid, name), ...constraints), (snapshot) => {
    callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
  });
}

export function subscribeSubjects(uid, callback) {
  return subscribeUserCollection(uid, "subjects", callback, [orderBy("updatedAt", "desc")]);
}

export function subscribeLessons(uid, callback) {
  return subscribeUserCollection(uid, "lessons", callback, [orderBy("updatedAt", "desc"), limit(24)]);
}

export function subscribeWeakQuestions(uid, callback) {
  return subscribeUserCollection(uid, "questions", callback, [
    where("mastery", "<", 70),
    orderBy("mastery", "asc"),
    limit(20),
  ]);
}

export async function getWrongAnswers(uid) {
  if (!isFirebaseConfigured) {
    return sortByUpdated(localList(uid, "answers").filter((answer) => !answer.isCorrect)).slice(0, 20);
  }
  const snapshot = await getDocs(
    query(
      collection(db, "users", uid, "answers"),
      where("isCorrect", "==", false),
      orderBy("answeredAt", "desc"),
      limit(20),
    ),
  );
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function uploadNoteFile(uid, file, onProgress) {
  if (!isFirebaseConfigured) {
    onProgress?.(35);
    const content = /\.(txt|md)$/i.test(file.name) ? await file.text() : `Notes uploaded as ${file.name}.`;
    onProgress?.(100);
    const localFile = {
      id: makeId("file"),
      name: file.name,
      size: file.size,
      type: file.type,
      content,
      status: "uploaded",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    updateLocalUser(uid, (userData) => ({ ...userData, files: [localFile, ...userData.files] }));
    return localFile;
  }

  onProgress?.(20);

  // Upload directly to Cloudinary (unsigned)
  const resourceType = file.type === 'application/pdf' ? 'raw' : 'auto';
  const uploadResult = await uploadToCloudinary(file, {
    folder: `lockon-revision/${uid}/learning`,
    resourceType,
  });

  onProgress?.(80);

  const fileDoc = await addDoc(collection(db, "users", uid, "files"), {
    name: file.name,
    size: file.size,
    type: file.type,
    cloudinaryPublicId: uploadResult.publicId,
    url: uploadResult.url,
    format: uploadResult.format,
    width: uploadResult.width,
    height: uploadResult.height,
    status: "uploaded",
    createdAt: serverTimestamp(),
  });

  onProgress?.(100);

  return { id: fileDoc.id, url: uploadResult.url, cloudinaryPublicId: uploadResult.publicId };
}

export async function processUploadedFile(fileId) {
  if (!isFirebaseConfigured) {
    const state = JSON.parse(localStorage.getItem("lockon-revision-local-state") || "{}");
    const uid = state.currentUserId;
    const file = uid ? state.users?.[uid]?.files?.find((item) => item.id === fileId) : null;
    if (!uid || !file) throw new Error("Local file not found.");
    await buildGeminiCourse(uid, file.content || file.name, fileId);
    return { data: { ok: true } };
  }

  try {
    const response = await fetch('/api/process-uploaded-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Vercel API error:", error);
    throw error;
  }
}

export async function processRawNotes(uid, text) {
  if (!isFirebaseConfigured) {
    return buildGeminiCourse(uid, text);
  }
  return buildFirebaseGeminiCourse(uid, text);
}

export async function askTutor(messages, context) {
  if (!isFirebaseConfigured) {
    const last = messages[messages.length - 1]?.content || "";
    return {
      reply:
        last.length > 0
          ? `Local tutor: ${last} connects back to your uploaded lessons. Try answering it as a question first, then compare against your lesson summaries.`
          : "Local tutor ready. Ask about a topic from your notes.",
    };
  }

  try {
    const response = await fetch('/api/ai-tutor-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, context }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Vercel API error:", error);
    throw error;
  }
}

export async function getHint(questionId) {
  if (!isFirebaseConfigured) {
    const state = JSON.parse(localStorage.getItem("lockon-revision-local-state") || "{}");
    const uid = state.currentUserId;
    const question = uid ? state.users?.[uid]?.questions?.find((item) => item.id === questionId) : null;
    const fallback = question
      ? `Look for the option that directly matches: ${question.topic}.`
      : "Eliminate the least relevant options first.";
    return fallback;
  }

  try {
    const response = await fetch('/api/generate-question-hint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const result = await response.json();
    return result.hint;
  } catch (error) {
    console.error("Vercel API error:", error);
    throw error;
  }
}

export async function explainWrongAnswer(questionId, selectedAnswer) {
  if (!isFirebaseConfigured) {
    const state = JSON.parse(localStorage.getItem("lockon-revision-local-state") || "{}");
    const uid = state.currentUserId;
    const question = uid ? state.users?.[uid]?.questions?.find((item) => item.id === questionId) : null;
    const fallback = question
      ? `"${selectedAnswer}" is not the best match. The answer is "${question.correctAnswer}" because it is grounded in the uploaded lesson.`
      : "Review the lesson summary, then retry the question.";
    return fallback;
  }

  try {
    const response = await fetch('/api/explain-wrong-answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId, selectedAnswer }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const result = await response.json();
    return result.explanation;
  } catch (error) {
    console.error("Vercel API error:", error);
    throw error;
  }
}

export async function recordAnswer(uid, question, selectedAnswer) {
  if (!isFirebaseConfigured) {
    const isCorrect = selectedAnswer === question.correctAnswer;
    const now = new Date().toISOString();
    updateLocalUser(uid, (userData) => ({
      ...userData,
      answers: [
        {
          id: makeId("answer"),
          questionId: question.id,
          lessonId: question.lessonId,
          subjectId: question.subjectId,
          prompt: question.prompt,
          selectedAnswer,
          correctAnswer: question.correctAnswer,
          isCorrect,
          answeredAt: now,
          updatedAt: now,
        },
        ...userData.answers,
      ],
      xp: userData.xp + (isCorrect ? 10 : 0),
    }));
    return { isCorrect, xpEarned: isCorrect ? 10 : 0 };
  }

  const isCorrect = selectedAnswer === question.correctAnswer;
  const xpEarned = isCorrect ? 10 : 0;
  const now = serverTimestamp();

  await addDoc(collection(db, "users", uid, "answers"), {
    questionId: question.id,
    lessonId: question.lessonId,
    subjectId: question.subjectId,
    prompt: question.prompt,
    selectedAnswer,
    correctAnswer: question.correctAnswer,
    isCorrect,
    answeredAt: now,
    updatedAt: now,
  });

  await updateDoc(doc(db, "users", uid), {
    xp: increment(xpEarned),
    "dailyUsage.answersCount": increment(1),
    updatedAt: now,
  });

  return { isCorrect, xpEarned };
}

export async function completeLesson(uid, lessonId, xpEarned, perfectLesson = false) {
  if (!isFirebaseConfigured) {
    updateLocalUser(uid, (userData) => {
      const lesson = userData.lessons?.find(l => l.id === lessonId);
      if (lesson) {
        lesson.completed = true;
        lesson.completedAt = new Date().toISOString();
        lesson.xpEarned = xpEarned;
        lesson.perfect = perfectLesson;
      }
      return {
        ...userData,
        xp: userData.xp + xpEarned + (perfectLesson ? 5 : 0),
        streak: perfectLesson ? userData.streak + 1 : userData.streak,
      };
    });
    return { success: true, totalXP: xpEarned + (perfectLesson ? 5 : 0) };
  }

  const now = serverTimestamp();
  const bonusXP = perfectLesson ? 5 : 0;
  const totalXP = xpEarned + bonusXP;

  await updateDoc(doc(db, "users", uid, "lessons", lessonId), {
    completed: true,
    completedAt: now,
    xpEarned: totalXP,
    perfect: perfectLesson,
    updatedAt: now,
  });

  const userPatch = {
    xp: increment(totalXP),
    "dailyUsage.lessonsCompleted": increment(1),
    updatedAt: now,
  };
  if (perfectLesson) userPatch.streak = increment(1);

  await updateDoc(doc(db, "users", uid), userPatch);

  return { success: true, totalXP };
}

export async function submitExerciseAnswer(uid, lessonId, exerciseId, answer) {
  if (!isFirebaseConfigured) {
    const state = JSON.parse(localStorage.getItem("lockon-revision-local-state") || "{}");
    const userData = state.users?.[uid];
    const lesson = userData?.lessons?.find(l => l.id === lessonId);
    const exercise = lesson?.exercises?.find(e => e.id === exerciseId);
    
    if (!exercise) {
      throw new Error("Exercise not found");
    }

    const isCorrect = answer === exercise.correctAnswer;
    const now = new Date().toISOString();
    
    updateLocalUser(uid, (userData) => ({
      ...userData,
      exerciseAnswers: [
        {
          id: makeId("exercise-answer"),
          lessonId,
          exerciseId,
          answer,
          correctAnswer: exercise.correctAnswer,
          isCorrect,
          answeredAt: now,
        },
        ...(userData.exerciseAnswers || []),
      ],
    }));

    return { isCorrect, explanation: exercise.explanation };
  }

  const now = serverTimestamp();
  
  await addDoc(collection(db, "users", uid, "exerciseAnswers"), {
    lessonId,
    exerciseId,
    answer,
    answeredAt: now,
  });

  throw new Error("Exercise answer submission requires client-side lesson exercise data.");
}

export function findNextLesson(lessons = [], questions = []) {
  const weakByLesson = questions.reduce((acc, question) => {
    acc[question.lessonId] = Math.min(acc[question.lessonId] ?? 100, question.mastery ?? 50);
    return acc;
  }, {});

  return [...lessons].sort((a, b) => {
    const aScore = weakByLesson[a.id] ?? a.mastery ?? 100;
    const bScore = weakByLesson[b.id] ?? b.mastery ?? 100;
    return aScore - bScore;
  })[0];
}
