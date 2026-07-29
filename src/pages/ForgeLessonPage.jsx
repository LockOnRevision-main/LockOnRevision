import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { LessonPlayer } from "../components/LessonPlayer.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { completeLesson } from "../services/learningService.js";
import { getDocs, query, collection, where } from "firebase/firestore";
import { db, isFirebaseConfigured } from "../config/firebase.js";
import { getLocalUser } from "../services/localStore.js";

export function ForgeLessonPage() {
  const { subjectId, lessonId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!lessonId || !user?.uid) return;

    async function loadLesson() {
      try {
        if (!isFirebaseConfigured) {
          const userData = getLocalUser(user.uid);
          const found = userData?.lessons?.find((l) => l.id === lessonId);
          if (found) setLesson(found);
        } else {
          const snap = await getDocs(
            query(collection(db, "users", user.uid, "lessons"), where("__name__", "==", lessonId))
          );
          if (!snap.empty) {
            setLesson({ id: snap.docs[0].id, ...snap.docs[0].data() });
          }
        }
      } catch {
        setStatus("Failed to load lesson.");
      } finally {
        setLoading(false);
      }
    }

    loadLesson();
  }, [lessonId, user?.uid]);

  const handleCompleteLesson = useCallback(async (lessonId, xpEarned, perfect, correctCount, totalCount) => {
    try {
      const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 100;
      const result = await completeLesson(user.uid, lessonId, xpEarned, perfect, {
        difficulty: lesson?.difficulty || "medium",
        grade: profile?.grade,
        curriculum: profile?.curriculum,
        subjectName: lesson?.subjectName,
        accuracy,
      });
      if (!result.success && result.reason === "already-completed") {
        setStatus("This lesson was already completed.");
      } else if (result.success) {
        setStatus(`Lesson completed! +${result.totalXP} XP, +${result.energyAward} Energy${perfect ? " (Perfect!)" : ""}`);
      }
    } catch (error) {
      setStatus(error.message);
    }
  }, [user?.uid, profile, lesson]);

  const handleBack = useCallback(() => {
    if (subjectId) {
      navigate(`/forge/subject/${subjectId}`);
    } else {
      navigate("/forge");
    }
  }, [navigate, subjectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6 text-center">
        <p className="text-lg font-bold text-text-primary mb-4">Lesson not found</p>
        <button
          onClick={handleBack}
          className="px-6 py-3 bg-primary text-white rounded-xl font-black"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <button
        onClick={handleBack}
        className="mb-4 text-sm font-bold text-text-secondary hover:text-text-primary flex items-center gap-2 transition-colors"
      >
        &larr; Back to Curriculum
      </button>
      {status && (
        <div className="mb-4 p-3 rounded-xl text-sm font-bold text-center border border-status-success/30 bg-status-success/10 text-status-success">
          {status}
        </div>
      )}
      <LessonPlayer lesson={lesson} onComplete={handleCompleteLesson} />
    </div>
  );
}
