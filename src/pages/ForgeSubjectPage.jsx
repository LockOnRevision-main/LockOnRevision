import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ForgeCurriculumView } from "../components/ForgeCurriculumView.jsx";
import { useAuth } from "../context/AuthContext.jsx";
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
  const [subjects, setSubjects] = useState([]);
  const [units, setUnits] = useState([]);
  const [subUnits, setSubUnits] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!user?.uid) return;
    const unsub1 = subscribeForgeSubjects(user.uid, setSubjects);
    const unsub2 = subscribeForgeUnits(user.uid, setUnits);
    const unsub3 = subscribeForgeSubUnits(user.uid, setSubUnits);
    const unsub4 = subscribeForgeLessons(user.uid, setLessons);
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
    setStatus("Regenerating structure...");
    try {
      const context = await getForgeContext(user.uid);
      const sourceText = context.sourceText || "";
      if (!sourceText) throw new Error("No source material available to regenerate from.");

      await regenerateForgeStructure(user.uid, draft.id, sourceText);
      setStatus("Structure regenerated.");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  const selectedSubject = subjects.find((s) => s.id === subjectId);
  const subjectUnits = units.filter((u) => u.subjectId === subjectId);
  const subjectSubUnits = subUnits.filter((su) => subjectUnits.some((u) => u.id === su.unitId));
  const subjectLessons = lessons.filter((l) => l.subjectId === subjectId);

  if (!selectedSubject) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 text-center">
        <p className="text-lg font-bold text-text-primary mb-4">Subject not found</p>
        <button
          onClick={handleBackToSubjects}
          className="px-6 py-3 bg-primary text-white rounded-xl font-black"
        >
          Back to Forge
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      {busy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center shadow-lg shadow-secondary/20">
              <RefreshCw className="w-8 h-8 text-white animate-spin" />
            </div>
            <div className="text-lg font-bold text-text-primary">{status || "Processing..."}</div>
          </div>
        </div>
      )}

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
  );
}
