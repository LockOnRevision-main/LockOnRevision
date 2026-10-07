import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState.jsx";
import { ForgeCurriculumView } from "../components/ForgeCurriculumView.jsx";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext.jsx";
import { useStagedProgress } from "../hooks/useStagedProgress.js";
import { LoadingOverlay } from "../components/LoadingOverlay.jsx";
import {
  getForgeContext,
  regenerateForgeStructure,
  subscribeForgeSubjects,
  subscribeForgeUnits,
  subscribeForgeSubUnits,
  subscribeForgeLessons,
} from "../services/forgeService.js";

export function ForgeSubjectPage() {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [subjects, setSubjects] = useState([]);
  const [units, setUnits] = useState([]);
  const [subUnits, setSubUnits] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const loader = useStagedProgress({ busy, minDuration: 1000 });

  useEffect(() => {
    if (!user?.uid) return;
    const onErr = (err) => setLoadError(err?.message?.includes("Failed to fetch") ? "We couldn't load your learning data. Please check your connection and try again." : (err?.message || "We couldn't load your learning data. Please try again."));
    const markLoaded = () => setLoaded(true);
    const unsub1 = subscribeForgeSubjects(user.uid, (items) => { setSubjects(items); markLoaded(); }, onErr);
    const unsub2 = subscribeForgeUnits(user.uid, setUnits, onErr);
    const unsub3 = subscribeForgeSubUnits(user.uid, setSubUnits, onErr);
    const unsub4 = subscribeForgeLessons(user.uid, setLessons, onErr);
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
  }, [user?.uid]);

  useEffect(() => {
    const selected = subjects.find((item) => item.id === subjectId);
    setDraft(selected ? JSON.parse(JSON.stringify(selected)) : null);
  }, [subjects, subjectId]);

  const handleBackToSubjects = useCallback(() => {
    navigate("/forge");
  }, [navigate]);

  const handleStartLesson = (lesson) => {
    navigate(`/forge/lesson/${lesson.subjectId}/${lesson.id}`);
  };

  async function handleRegenerate() {
    if (!draft) return;

    setBusy(true);
    loader.setStage(2);
    setStatus(t('forge_subject.regenerating'));
    try {
      loader.setProgress(40);
      const context = await getForgeContext(user.uid);
      const sourceText = context.sourceText || "";
      if (!sourceText) throw new Error(t('forge_subject.no_source'));
      loader.setStage(3);
      await regenerateForgeStructure(user.uid, draft.id, sourceText);
      loader.setStage(4);
      loader.setProgress(90);
      await new Promise((r) => setTimeout(r, 300));
      loader.setStage(5);
      setStatus(t('forge_subject.regenerated'));
    } catch (error) {
      console.error("[ForgeSubjectPage] regenerate failed", error);
      setStatus("We couldn't regenerate this subject. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const selectedSubject = subjects.find((s) => s.id === subjectId);
  const subjectUnits = units.filter((u) => u.subjectId === subjectId);
  const subjectSubUnits = subUnits.filter((su) => subjectUnits.some((u) => u.id === su.unitId));
  const subjectLessons = lessons.filter((l) => l.subjectId === subjectId);

  if (!loaded && !loadError) {
    return (
      <div className="mx-auto grid max-w-4xl gap-4 px-4 pt-4 sm:px-6 sm:pt-6" role="status" aria-label={t("common.loading")}>
        <div className="skeleton h-8 w-1/2" />
        <div className="skeleton h-4 w-2/3" />
        <div className="card grid gap-3 p-5">
          <div className="skeleton h-6 w-1/3" />
          <div className="skeleton h-16 w-full !rounded-xl" />
          <div className="skeleton h-16 w-full !rounded-xl" />
        </div>
      </div>
    );
  }

  if (!selectedSubject) {
    return (
      <div className="mx-auto max-w-4xl px-4 pt-4 sm:px-6 sm:pt-6">
        <EmptyState
          title={t("forge.subject_not_found")}
          copy={t("forge.no_subjects")}
          action={<button type="button" onClick={handleBackToSubjects} className="btn-primary">{t("forge.back_to_forge")}</button>}
        />
      </div>
    );
  }

  return (
    <div className="relative">
      <LoadingOverlay progress={loader.progress} stage={status || loader.stage} visible={loader.visible} />

      <div className="mx-auto max-w-4xl px-4 pt-4 sm:px-6 sm:pt-6">
        {loadError ? (
          <p className="alert alert-warning mb-4" role="alert">{loadError}</p>
        ) : null}
        {!busy && !loader.visible && status ? (
          <p className={`alert mb-4 ${status === t('forge_subject.regenerated') ? "alert-success" : "alert-error"}`} role="status">{status}</p>
        ) : null}
        <div className="mb-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleBackToSubjects}
            className="inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-text-secondary transition-colors hover:text-text-primary"
          >
            <span aria-hidden="true">&larr;</span> {t("forge.all_subjects")}
          </button>
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={busy || !draft}
            className="btn-ghost !min-h-[40px] !py-2 text-[13px]"
          >
            <RefreshCw size={15} className={busy ? "animate-spin-slow" : ""} />
            {t("forge.regenerate")}
          </button>
        </div>
      </div>
      <ForgeCurriculumView
        subject={selectedSubject}
        units={subjectUnits}
        subUnits={subjectSubUnits}
        lessons={subjectLessons}
        onStartLesson={handleStartLesson}
      />
    </div>
  );
}
