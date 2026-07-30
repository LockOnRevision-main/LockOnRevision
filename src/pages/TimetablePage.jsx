import { CalendarDays, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { TimetableDisplay } from "../components/TimetableDisplay.jsx";
import { TimetableForm } from "../components/TimetableForm.jsx";

import { generateTimetable, savePreferencesLocally, saveTimetable, subscribeTimetables } from "../services/timetableService.js";
import { setupTimetableIntegration } from "../services/timetableIntegration.js";

export function TimetablePage() {
  const { user } = useAuth();
  const [timetable, setTimetable] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const timetableRef = useRef(null);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeTimetables(user.uid, (data) => {
      if (data.length > 0) {
        setTimetable((prev) => prev || data[0]);
      }
    });
    return unsub;
  }, [user?.uid]);

  // Wire up timetable-forge integration
  useEffect(() => {
    if (!user?.uid || !timetable?.id) return;
    timetableRef.current = timetable;
    const cleanup = setupTimetableIntegration(user.uid, timetable.id, timetableRef);
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, timetable?.id]);

  const handleGenerate = async (preferences) => {
    setBusy(true);
    setError("");
    setTimetable(null);
    setSaved(false);
    try {
      savePreferencesLocally(preferences);
      const result = await generateTimetable(preferences);
      setTimetable(result);
      await saveTimetable(user.uid, result);
      setSaved(true);
    } catch (err) {
      setError(err.message || "Failed to generate timetable.");
    } finally {
      setBusy(false);
    }
  };

  const handleRegenerate = () => {
    setTimetable(null);
  };

  return (
    <div className="grid gap-8">
      {/* Page header */}
      <section className="overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
        <div className="bg-gradient-to-r from-secondary to-primary p-10 text-text-primary">
          <div className="flex items-center gap-3">
            <CalendarDays size={28} className="text-white/90" />
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">Planning</p>
              <h1 className="text-4xl font-black tracking-tight text-text-primary">Study Timetable</h1>
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-lg text-text-primary/85">
            Generate a personalised rolling timetable that balances your subjects, difficulty, and confidence levels.
          </p>
        </div>
      </section>

      {error ? (
        <p className="rounded-xl border border-status-error/20 bg-status-error/10 px-4 py-3 text-sm font-bold text-status-error">
          {error}
        </p>
      ) : null}

      {saved ? (
        <p className="rounded-xl border border-status-success/20 bg-status-success/10 px-4 py-3 text-sm font-bold text-status-success">
          Timetable saved to your account.
        </p>
      ) : null}

      {timetable ? (
        <>
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface px-5 py-3 text-sm text-text-secondary shadow-sm">
            <RefreshCw size={16} className="text-primary" />
            Want to change your subjects or hours?
            <button
              type="button"
              onClick={handleRegenerate}
              className="ml-1 font-bold text-primary underline underline-offset-2 hover:text-secondary"
            >
              Start over
            </button>
          </div>
          <TimetableDisplay timetable={timetable} onRegenerate={handleRegenerate} />
        </>
      ) : (
        <>
          {busy ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-border bg-surface p-16 shadow-sm">
              <RefreshCw size={40} className="animate-spin text-primary" />
              <p className="mt-6 text-lg font-black tracking-tight text-text-primary">Creating your study plan...</p>
              <p className="mt-2 text-sm text-text-secondary">Balancing subjects, difficulty, and your availability.</p>
            </div>
          ) : (
            <TimetableForm onGenerate={handleGenerate} busy={busy} />
          )}
        </>
      )}
    </div>
  );
}
