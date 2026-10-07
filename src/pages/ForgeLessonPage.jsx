import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState.jsx";
import { LessonPlayer } from "../components/LessonPlayer.jsx";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext.jsx";
import { completeLesson } from "../services/learningService.js";
import { getDocs, query, collection, where } from "firebase/firestore";
import { db, isFirebaseConfigured } from "../config/firebase.js";
import { getLocalUser } from "../services/localStore.js";

export function ForgeLessonPage() {
  const { subjectId, lessonId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { t } = useTranslation();
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [statusTone, setStatusTone] = useState("success");

  function showStatus(message, tone = "success") {
    setStatus(message);
    setStatusTone(tone);
  }

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
        showStatus(t('forge_lesson.failed_load'), "error");
      } finally {
        setLoading(false);
      }
    }

    loadLesson();
  }, [lessonId, user?.uid, t]);

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
        showStatus(t('forge_lesson.already_completed'), "info");
      } else if (result.success) {
        showStatus(t('forge_lesson.completed', { xp: result.totalXP, energy: result.energyAward, perfect: perfect ? t('forge_lesson.perfect_suffix') : '' }), "success");
      }
    } catch (error) {
      showStatus(error.message || t('forge_lesson.failed_load'), "error");
    }
  }, [user?.uid, profile, lesson, t]);

  const handleBack = useCallback(() => {
    if (subjectId) {
      navigate(`/forge/subject/${subjectId}`);
    } else {
      navigate("/forge");
    }
  }, [navigate, subjectId]);

  if (loading) {
    return (
      <div className="mx-auto grid max-w-4xl gap-4 p-4 sm:p-6" role="status" aria-label={t("common.loading")}>
        <div className="skeleton h-8 w-2/3" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-11/12" />
        <div className="card mt-2 grid gap-3 p-5">
          <div className="skeleton h-5 w-1/3" />
          <div className="skeleton h-11 w-full !rounded-xl" />
          <div className="skeleton h-11 w-full !rounded-xl" />
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="mx-auto max-w-4xl p-4 sm:p-6">
        <EmptyState
          title={t("forge.lesson_not_found")}
          copy={t("forge.no_lessons")}
          action={<button type="button" onClick={handleBack} className="btn-primary">{t("common.back")}</button>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6">
      <button
        type="button"
        onClick={handleBack}
        className="mb-4 flex items-center gap-2 text-sm font-semibold text-text-secondary transition-colors hover:text-text-primary"
      >
        <span aria-hidden="true">&larr;</span> {t("forge.back_to_curriculum")}
      </button>
      {status && (
        <p className={`alert mb-4 text-center ${statusTone === "error" ? "alert-error" : statusTone === "info" ? "alert-info" : "alert-success"}`} role="status">
          {status}
        </p>
      )}
      <LessonPlayer lesson={lesson} onComplete={handleCompleteLesson} />
    </div>
  );
}
