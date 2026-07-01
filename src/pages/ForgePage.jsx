import { FileUp, RefreshCw, Save } from "lucide-react";
import React, { useEffect, useState } from "react";
import { ForgeStructureEditor } from "../components/ForgeStructureEditor.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { ForgeCurriculumView } from "../components/ForgeCurriculumView.jsx";
import { LessonPlayer } from "../components/LessonPlayer.jsx";
import { Logo } from "../components/Logo.jsx";
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
  const { user } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [units, setUnits] = useState([]);
  const [subUnits, setSubUnits] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [draft, setDraft] = useState(null);
  const [pastedNotes, setPastedNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);

  useEffect(() => subscribeForgeSubjects(user.uid, setSubjects), [user.uid]);
  useEffect(() => subscribeForgeUnits(user.uid, setUnits), [user.uid]);
  useEffect(() => subscribeForgeSubUnits(user.uid, setSubUnits), [user.uid]);
  useEffect(() => subscribeForgeLessons(user.uid, setLessons), [user.uid]);

  useEffect(() => {
    if (selectedId === null && subjects.length) {
      setSelectedId(subjects[0].id);
      return;
    }
    if (selectedId && subjects.length && !subjects.some((subject) => subject.id === selectedId)) {
      setSelectedId(subjects[0].id);
    }
  }, [subjects, selectedId]);

  useEffect(() => {
    const selected = subjects.find((item) => item.id === selectedId);
    setDraft(selected ? JSON.parse(JSON.stringify(selected)) : null);
  }, [subjects, selectedId]);

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
      const generated = await generateForgeStructure(
        user.uid,
        sourceText,
        uploaded.map((item) => item.id),
        uploaded,
      );
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
      setSelectedId(regenerated.id);
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
      setSelectedId(saved.id);
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

  const handleCompleteLesson = async (lessonId, xpEarned, perfect) => {
    try {
      await completeLesson(user.uid, lessonId, xpEarned, perfect);
      setSelectedLesson(null);
      setStatus(`Lesson completed! +${xpEarned} XP${perfect ? " (Perfect!)" : ""}`);
    } catch (error) {
      setStatus(error.message);
    }
  };

  const selectedSubject = subjects.find((s) => s.id === selectedId);
  const subjectUnits = units.filter((u) => u.subjectId === selectedId);
  const subjectSubUnits = subUnits.filter((su) => subjectUnits.map((u) => u.id).includes(su.unitId));
  const subjectLessons = lessons.filter((l) => l.subjectId === selectedId);

  if (selectedLesson) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <button
          onClick={() => setSelectedLesson(null)}
          className="mb-4 text-text-secondary hover:text-text-primary flex items-center gap-2"
        >
          &larr; Back to Curriculum
        </button>
        <LessonPlayer
          lesson={selectedLesson}
          onComplete={handleCompleteLesson}
        />
      </div>
    );
  }

  return (
    <div className="relative space-y-6">
      {busy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface/80 backdrop-blur-sm">
             <div className="flex flex-col items-center gap-4 p-8 text-center">
               <Logo variant="icon" className="w-16 h-16 animate-pulse" />
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
          <div className="max-w-4xl mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setSelectedId("")}
                className="text-text-secondary hover:text-text-primary"
              >
                &larr; All Subjects
              </button>
              <div className="flex gap-2">
                <button
                  onClick={handleRegenerate}
                  disabled={busy || !draft}
                  className="flex items-center gap-2 px-4 py-2 bg-background text-text-secondary rounded-lg hover:bg-surface transition-colors disabled:opacity-50"
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
        <React.Fragment>
          <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-text-primary">My Subjects</h2>
                       <button
                        onClick={() => setSelectedId("")}
                        className="text-sm font-bold text-primary hover:text-primary-active"
                      >
                View All
              </button>
            </div>
            <div className="mt-4 flex gap-2 flex-wrap">
              {subjects.map((subject) => (
                <button
                  key={subject.id}
                  type="button"
                  onClick={() => setSelectedId(subject.id)}
                  className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                     selectedId === subject.id
                      ? "border-primary bg-primary text-white"
                      : "border-border text-text-secondary hover:border-border"
                  }`}
                >
                  {subject.title}
                </button>
              ))}
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
              <p className="text-sm font-bold uppercase tracking-widest text-text-secondary">Forge New</p>
              <h2 className="mt-1 text-2xl font-black">Study materials</h2>

               <label className="mt-4 grid cursor-pointer place-items-center rounded-xl border-2 border-dashed border-border bg-background p-8 text-center transition hover:border-primary">
                  <FileUp size={32} className="text-primary" />
                 <strong className="mt-3">Upload notes or documents</strong>
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
                  className="mt-4 min-h-40 w-full resize-y rounded-lg border border-border px-4 py-3 text-sm leading-6 outline-none focus:border-primary"
                 placeholder="Or paste notes here..."
                 disabled={busy}
               />

               <button
                 type="button"
                 disabled={busy}
                 onClick={handleGenerateFromPaste}
                 className="mt-3 w-full rounded-lg bg-secondary px-4 py-3 font-black text-white disabled:bg-text-muted"
               >
                 Generate from pasted notes
               </button>
            </section>

            <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold uppercase tracking-widest text-text-secondary">Structure</p>
                  <h2 className="text-2xl font-black">Edit learning path</h2>
                </div>
                {draft ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={handleRegenerate}
                      className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-bold text-text-secondary disabled:opacity-50"
                    >
                      <RefreshCw size={16} />
                      Regenerate
                    </button>
                     <button
                      type="button"
                      disabled={busy}
                      onClick={handleSave}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-black text-white disabled:bg-primary-active"
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
        </React.Fragment>
      )}
    </div>
  );
}
