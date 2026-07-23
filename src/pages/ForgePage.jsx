import { FileUp, RefreshCw, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ForgeStructureEditor } from "../components/ForgeStructureEditor.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { ForgeCurriculumView } from "../components/ForgeCurriculumView.jsx";
import { LessonPlayer } from "../components/LessonPlayer.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { completeLesson } from "../services/learningService.js";
import {
  generateForgeStructure,
  getForgeContext,
  regenerateForgeStructure,
  saveForgeStructure,
  subscribeForgeSubjects,
  subscribeForgeUnits,
  subscribeForgeSubUnits,
  subscribeForgeLessons,
  uploadForgeFiles,
} from "../services/forgeService.js";

export function ForgePage() {
  const { user, profile } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [units, setUnits] = useState([]);
  const [subUnits, setSubUnits] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [viewingSubjectList, setViewingSubjectList] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [draft, setDraft] = useState(null);
  const [pastedNotes, setPastedNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub1 = subscribeForgeSubjects(user.uid, setSubjects);
    const unsub2 = subscribeForgeUnits(user.uid, setUnits);
    const unsub3 = subscribeForgeSubUnits(user.uid, setSubUnits);
    const unsub4 = subscribeForgeLessons(user.uid, setLessons);
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
  }, [user?.uid]);

  useEffect(() => {
    if (selectedId === null && subjects.length > 0 && !viewingSubjectList) {
      setSelectedId(subjects[0].id);
      return;
    }
    if (selectedId && subjects.length > 0 && !subjects.some((s) => s.id === selectedId)) {
      setSelectedId(subjects[0].id);
    }
  }, [subjects, selectedId, viewingSubjectList]);

  useEffect(() => {
    const selected = subjects.find((item) => item.id === selectedId);
    setDraft(selected ? JSON.parse(JSON.stringify(selected)) : null);
  }, [subjects, selectedId]);

  const handleBackToSubjects = useCallback(() => {
    setSelectedId(null);
    setDraft(null);
    setViewingSubjectList(true);
  }, []);

  async function handleUpload(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    setBusy(true);
    setStatus("Uploading files...");
    setProgress(0);

    try {
      const { uploaded, combinedText } = await uploadForgeFiles(user.uid, files, setProgress);
      const sourceText = [pastedNotes.trim(), combinedText].filter(Boolean).join("\n\n---\n\n");
      if (!sourceText.trim()) throw new Error("No readable content found in uploaded files.");

      setStatus("Generating learning structure with Gemini...");
      const generated = await generateForgeStructure(user.uid, sourceText, uploaded.map((item) => item.id), uploaded);
      setSelectedId(generated.id);
      setPastedNotes("");
      setStatus("Learning path generated successfully.");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  async function handleGenerateFromPaste() {
    if (!pastedNotes.trim()) {
      setStatus("Paste notes or upload files first.");
      return;
    }

    setBusy(true);
    setProgress(100);
    setStatus("Generating learning structure with Gemini...");

    try {
      const generated = await generateForgeStructure(user.uid, pastedNotes.trim(), []);
      setSelectedId(generated.id);
      setPastedNotes("");
      setStatus("Learning path generated successfully.");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRegenerate() {
    if (!draft) return;

    setBusy(true);
    setStatus("Regenerating structure...");
    try {
      const context = await getForgeContext(user.uid);
      const sourceText = context.sourceText || pastedNotes.trim();
      if (!sourceText) throw new Error("No source material available to regenerate from.");

      const regenerated = await regenerateForgeStructure(user.uid, draft.id, sourceText);
      setSelectedId(regenerated?.id || draft.id);
      setStatus("Structure regenerated.");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    if (!draft) return;

    setBusy(true);
    setStatus("Saving changes...");
    try {
      const saved = await saveForgeStructure(user.uid, draft);
      setSelectedId(saved?.id || draft.id);
      setStatus("Changes saved.");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  const handleStartLesson = (lesson) => {
    setSelectedLesson(lesson);
  };

  const handleCompleteLesson = async (lessonId, xpEarned, perfect, correctCount, totalCount) => {
    try {
      const lesson = lessons.find((l) => l.id === lessonId);
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
      setSelectedLesson(null);
    } catch (error) {
      setStatus(error.message);
    }
  };

  const selectedSubject = subjects.find((s) => s.id === selectedId);
  const subjectUnits = units.filter((u) => u.subjectId === selectedId);
  const subjectSubUnits = subUnits.filter((su) => subjectUnits.some((u) => u.id === su.unitId));
  const subjectLessons = lessons.filter((l) => l.subjectId === selectedId);

  if (selectedLesson) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <button
          onClick={() => setSelectedLesson(null)}
          className="mb-4 text-sm font-bold text-text-secondary hover:text-text-primary flex items-center gap-2 transition-colors"
        >
          &larr; Back to Curriculum
        </button>
        <LessonPlayer lesson={selectedLesson} onComplete={handleCompleteLesson} />
      </div>
    );
  }

  return (
    <div className="relative space-y-6">
      {busy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center shadow-lg shadow-secondary/20">
              <RefreshCw className="w-8 h-8 text-white animate-spin" />
            </div>
            <div className="text-lg font-bold text-text-primary">{status || "Processing..."}</div>
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

      {selectedSubject && subjectUnits.length > 0 && !selectedLesson ? (
        <div>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={handleBackToSubjects}
                className="inline-flex items-center gap-2 text-sm font-bold text-text-secondary hover:text-text-primary transition-colors"
              >
                &larr; All Subjects
              </button>
              <div className="flex gap-2">
                <button
                  onClick={handleRegenerate}
                  disabled={busy || !draft}
                  className="flex items-center gap-2 px-4 py-2 bg-background border border-border text-text-secondary rounded-xl text-sm font-bold hover:bg-surface transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  <RefreshCw className={`w-4 h-4 ${busy ? "animate-spin" : ""}`} />
                  Regenerate
                </button>
              </div>
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
      ) : (
        <>
          <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-text-primary">My Subjects</h2>
              {selectedId && subjects.length > 0 && (
                <button
                  onClick={handleBackToSubjects}
                  className="text-sm font-bold text-primary hover:text-primary-active transition-colors"
                >
                  View All
                </button>
              )}
            </div>
            <div className="mt-4 flex gap-2 flex-wrap">
              {subjects.length === 0 && !busy && (
                <p className="text-sm text-text-muted">No subjects yet. Upload notes or paste content below to get started.</p>
              )}
              {subjects.map((subject) => (
                <button
                  key={subject.id}
                  type="button"
                  onClick={() => { setSelectedId(subject.id); setViewingSubjectList(false); }}
                  className={`rounded-full border px-4 py-2 text-sm font-bold transition-colors ${
                    selectedId === subject.id
                      ? "border-primary bg-primary text-white"
                      : "border-border text-text-secondary hover:border-primary/50 hover:text-text-primary"
                  }`}
                >
                  {subject.title}
                </button>
              ))}
            </div>
          </section>

          {subjects.length === 0 && !busy && (
            <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
                <p className="text-sm font-bold uppercase tracking-widest text-text-secondary">Forge New</p>
                <h2 className="mt-1 text-2xl font-black text-text-primary">Study materials</h2>

                <label className="mt-4 grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-border bg-background p-8 text-center transition hover:border-primary focus-within:ring-2 focus-within:ring-primary/50">
                  <FileUp size={32} className="text-primary" />
                  <strong className="mt-3 text-text-primary">Upload notes or documents</strong>
                  <span className="mt-1 text-sm text-text-secondary">PDF, text, or images up to 20MB each</span>
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
                  placeholder="Or paste notes here..."
                  disabled={busy}
                />

                <button
                  type="button"
                  disabled={busy || !pastedNotes.trim()}
                  onClick={handleGenerateFromPaste}
                  className="mt-3 w-full rounded-xl bg-secondary px-4 py-3 font-black text-white disabled:bg-text-muted disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors hover:bg-secondary-hover"
                >
                  Generate from pasted notes
                </button>
              </section>

              <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-widest text-text-secondary">Structure</p>
                    <h2 className="text-2xl font-black text-text-primary">Edit learning path</h2>
                  </div>
                  {draft ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={handleRegenerate}
                        className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-bold text-text-secondary disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors hover:bg-background"
                      >
                        <RefreshCw size={16} />
                        Regenerate
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={handleSave}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-black text-white disabled:bg-primary-active disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors hover:bg-primary-active"
                      >
                        <Save size={16} />
                        Save changes
                      </button>
                    </div>
                  ) : null}
                </div>

                {draft ? (
                  <ForgeStructureEditor tree={draft} onChange={setDraft} />
                ) : (
                  <EmptyState
                    title="No structure yet"
                    copy="Upload notes or paste content to generate your first Forge learning path."
                  />
                )}
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
}
