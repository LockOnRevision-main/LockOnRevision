import { BookOpen, FileUp, RefreshCw, Trophy, Zap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext.jsx";
import {
  cleanupUploadedFiles,
  generateForgeStructure,
  subscribeForgeSubjects,
  subscribeForgeLessons,
  uploadForgeFiles,
} from "../services/forgeService.js";

export function ForgePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [subjects, setSubjects] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [pastedNotes, setPastedNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!user?.uid) return;
    setLoadError("");
    const onErr = (err) => {
      const msg = err?.message || "Failed to load subjects.";
      const isBlocked = (err?.code === "unavailable" || String(msg).toLowerCase().includes("failed to fetch"));
      setLoadError(isBlocked ? "Could not load subjects. Your network or DNS filter (NextDNS/AdGuard/Pi-hole) may be blocking firestore.googleapis.com. Please allow it and retry." : msg);
    };
    const unsub1 = subscribeForgeSubjects(user.uid, setSubjects, onErr);
    const unsub2 = subscribeForgeLessons(user.uid, setLessons, onErr);
    return () => { unsub1(); unsub2(); };
  }, [user?.uid]);

  const handleContinueLearning = useCallback(() => {
    if (subjects.length > 0) {
      navigate(`/forge/subject/${subjects[0].id}`);
    }
  }, [subjects, navigate]);

  async function handleUpload(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    // Prevent duplicate uploads
    if (busy) {
      setStatus(t('forge_page.upload_in_progress'));
      return;
    }

    let uploaded = [];

    setBusy(true);
    setStatus(t('forge_page.uploading_files'));
    setProgress(0);

    try {
      const result = await uploadForgeFiles(user.uid, files, setProgress);
      uploaded = result.uploaded;
      const combinedText = result.combinedText;
      const sourceText = [pastedNotes.trim(), combinedText].filter(Boolean).join("\n\n---\n\n");
      if (!sourceText.trim()) throw new Error(t('forge_page.no_readable_content'));

      setStatus(t('forge_page.generating_structure'));
      const generated = await generateForgeStructure(user.uid, sourceText, uploaded.map((item) => item.id), uploaded);
      await cleanupUploadedFiles(uploaded);
      navigate(`/forge/subject/${generated.id}`);
      setPastedNotes("");
      setStatus("Learning path generated successfully.");
    } catch (error) {
      await cleanupUploadedFiles(uploaded).catch(() => {});
      setStatus(error.message || t('forge_page.upload_failed'));
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  async function handleGenerateFromPaste() {
    if (!pastedNotes.trim()) {
      setStatus(t('forge_page.paste_or_upload_first'));
      return;
    }

    setBusy(true);
    setProgress(100);
    setStatus(t('forge_page.generating_structure'));

    try {
      const generated = await generateForgeStructure(user.uid, pastedNotes.trim(), []);
      navigate(`/forge/subject/${generated.id}`);
      setPastedNotes("");
      setStatus(t('forge_page.generated_success'));
    } catch (error) {
      setStatus(error.message || t('forge_page.upload_failed'));
    } finally {
      setBusy(false);
    }
  }

  const totalLessons = lessons.length;
  const completedLessons = lessons.filter((l) => l.completed).length;
  const totalXp = lessons.reduce((sum, l) => sum + (l.xpEarned || 0), 0);
  const hasSubjects = subjects.length > 0;

  return (
    <div className="relative space-y-6">
      {busy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center shadow-lg shadow-secondary/20">
              <RefreshCw className="w-8 h-8 text-white animate-spin" />
            </div>
            <div className="text-lg font-bold text-text-primary">{status || t("common.processing")}</div>
            {progress > 0 && (
              <div className="w-64 h-2 bg-background rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 space-y-6">
        {loadError ? (
          <div className="rounded-2xl border border-warning/30 bg-warning/10 p-4 flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-warning">{loadError}</p>
            <button onClick={() => window.location.reload()} className="shrink-0 rounded-xl bg-warning px-4 py-2 text-sm font-black text-white">Retry</button>
          </div>
        ) : null}
        {!loadError && subjects.length === 0 && lessons.length === 0 ? (
          <p className="text-sm text-text-muted text-center">No subjects yet — or Firestore is unreachable due to network filtering (check browser console for [forgeService] errors).</p>
        ) : null}
        {/* Generate New Subject */}
        <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-widest text-text-secondary">{t("forge.new_label")}</p>
          <h2 className="mt-1 text-2xl font-black text-text-primary">{t("forge.generate_subject")}</h2>

          <label className="mt-4 grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-border bg-background p-8 text-center transition hover:border-primary focus-within:ring-2 focus-within:ring-primary/50">
            <FileUp size={32} className="text-primary" />
            <strong className="mt-3 text-text-primary">{t("forge.upload_notes")}</strong>
            <span className="mt-1 text-sm text-text-secondary">{t("forge.upload_hint")}</span>
            <input
              className="hidden"
              type="file"
              multiple
              accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.webp,.gif,.svg,.docx,.pptx"
              onChange={handleUpload}
              disabled={busy}
            />
          </label>

          <textarea
            value={pastedNotes}
            onChange={(event) => setPastedNotes(event.target.value)}
            className="mt-4 min-h-40 w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm leading-6 text-text-primary outline-none focus:border-primary transition-colors placeholder:text-text-muted"
            placeholder={t("forge.paste_placeholder")}
            disabled={busy}
          />

          <button
            type="button"
            disabled={busy || !pastedNotes.trim()}
            onClick={handleGenerateFromPaste}
            className="mt-3 w-full rounded-xl bg-secondary px-4 py-3 font-black text-white disabled:bg-text-muted disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors hover:bg-secondary-hover"
          >
            {t("forge.generate_from_paste")}
          </button>
        </section>

        {/* Continue Previous Learning */}
        {hasSubjects && (
          <button
            onClick={handleContinueLearning}
            className="w-full rounded-3xl border border-border bg-surface p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-left group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center shrink-0">
                  <BookOpen size={24} className="text-secondary" />
                </div>
                <div>
                  <p className="text-lg font-black text-text-primary group-hover:text-primary transition-colors">{t("forge.continue_learning")}</p>
                  <p className="text-sm text-text-secondary mt-0.5">
                    {t("forge.resume", { title: subjects[0]?.title, count: subjects.length })}
                  </p>
                </div>
              </div>
              <span className="text-xl text-text-muted group-hover:text-primary transition-colors">&rarr;</span>
            </div>
          </button>
        )}

        {/* Recent Progress Summary */}
        {hasSubjects && (
          <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={20} className="text-primary" />
              <h2 className="text-lg font-black text-text-primary">{t("forge.recent_progress")}</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-background border border-border text-center">
                <p className="text-2xl font-black text-text-primary">{subjects.length}</p>
                <p className="text-xs font-bold uppercase tracking-widest text-text-muted mt-1">{t("forge.subjects_stat")}</p>
              </div>
              <div className="p-4 rounded-2xl bg-background border border-border text-center">
                <p className="text-2xl font-black text-text-primary">{completedLessons}/{totalLessons}</p>
                <p className="text-xs font-bold uppercase tracking-widest text-text-muted mt-1">{t("forge.lessons_stat")}</p>
              </div>
              <div className="p-4 rounded-2xl bg-background border border-border text-center">
                <p className="text-2xl font-black text-text-primary">
                  {totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0}%
                </p>
                <p className="text-xs font-bold uppercase tracking-widest text-text-muted mt-1">{t("forge.complete_stat")}</p>
              </div>
              <div className="p-4 rounded-2xl bg-background border border-border text-center">
                <p className="text-2xl font-black text-text-primary">
                  <span className="flex items-center justify-center gap-1">
                    {totalXp} <Trophy size={16} className="text-warning" />
                  </span>
                </p>
                <p className="text-xs font-bold uppercase tracking-widest text-text-muted mt-1">{t("forge.xp_earned_stat")}</p>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
