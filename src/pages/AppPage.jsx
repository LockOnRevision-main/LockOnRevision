import { Award, CheckCircle2, Clock, Target, Trophy, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { StatCard } from "../components/StatCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { TESTS, completeMockTest } from "../services/userService.js";
import { 
  subscribeSubjects, 
  subscribeUserCollection 
} from "../services/learningService.js";

function scoreBreakdown(profile) {
  const xp = Number(profile?.xp || 0);
  const energy = Number(profile?.energy || 0);
  return {
    xp,
    energy,
    totalScore: xp + energy * 100,
  };
}

export function AppPage() {
  const { isFirebaseConfigured, profile, user } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [units, setUnits] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [scoreInputs, setScoreInputs] = useState(() =>
    TESTS.reduce((acc, test) => ({ ...acc, [test.id]: 75 }), {}),
  );
  const [status, setStatus] = useState("");
  const [busyId, setBusyId] = useState("");
  const score = scoreBreakdown(profile);

  useEffect(() => {
    if (!user?.uid) return;

    const subSubjects = subscribeSubjects(user.uid, setSubjects);
    const subUnits = subscribeUserCollection(user.uid, "units", setUnits);
    const subLessons = subscribeUserCollection(user.uid, "lessons", setLessons);

    return () => {
      subSubjects();
      subUnits();
      subLessons();
    };
  }, [user?.uid]);

  async function runTest(testId) {
    setBusyId(testId);
    setStatus("");
    try {
      const result = await completeMockTest(user.uid, testId, Number(scoreInputs[testId]));
      setStatus(`Earned ${result.earnedEnergy} energy and ${result.earnedXp} XP.`);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusyId("");
    }
  }

  // Removed finishUnit function as it was unused

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="bg-gradient-to-r from-primary to-secondary p-6 text-text-primary">
          <p className="text-sm font-bold uppercase tracking-widest text-text-secondary">Dashboard</p>
          <div className="mt-2 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h1 className="text-4xl font-black tracking-tight text-text-primary">Welcome, {profile?.name || "Learner"}</h1>
              <p className="mt-2 max-w-2xl text-text-primary/85">Gain XP, earn energy, and climb the leaderboard.</p>
            </div>
            <Link
              to="/leaderboard"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-text-primary px-4 py-3 font-black text-primary shadow-sm"
            >
              <Trophy size={18} />
              Leaderboard
            </Link>
          </div>
        </div>
      </section>

      {!isFirebaseConfigured ? (
        <p className="rounded-lg border border-border bg-card p-3 text-sm font-bold text-text-primary">
          Firebase is not configured. Add env values and restart the dev server to enable dashboard actions.
        </p>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="XP" value={score.xp.toLocaleString()} helper="Learning progress" tone="bg-surface" />
        <StatCard label="Energy" value={String(score.energy)} helper="1 Energy = 100 XP" tone="bg-card" />
        <StatCard label="Total Score" value={score.totalScore.toLocaleString()} helper="XP + Energy bonus" tone="bg-surface" />
        <StatCard
          label="Completed"
          value={`${profile?.completedTests?.length || 0}/${TESTS.length}`}
          helper="Mock tests awarded"
          tone="bg-surface"
        />
      </section>

      {status ? <p className="rounded-lg border border-border bg-surface p-3 text-sm font-bold text-text-primary">{status}</p> : null}

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <Target className="text-primary" />
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-text-secondary">Mock tests</p>
              <h2 className="text-2xl font-black text-text-primary">Earn controlled energy</h2>
            </div>
          </div>
          <div className="grid gap-3">
            {TESTS.map((test) => {
              const completed = profile?.completedTests?.includes(test.id);
              return (
                <div key={test.id} className="rounded-lg border border-border p-4">
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                    <div>
                      <p className="font-black text-text-primary">{test.title}</p>
                      <p className="mt-1 text-sm text-text-secondary">
                        {test.difficulty} &bull; +{test.energy} energy &bull; +{test.xp} XP &bull; requires 60%+
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={scoreInputs[test.id]}
                        onChange={(event) => setScoreInputs({ ...scoreInputs, [test.id]: event.target.value })}
                        className="w-20 rounded-lg border border-border px-3 py-2 text-sm font-bold outline-none focus:border-primary bg-transparent text-text-primary"
                        aria-label={`${test.title} score`}
                      />
                      <button
                        type="button"
                        disabled={completed || busyId === test.id}
                        onClick={() => runTest(test.id)}
                        className="rounded-lg bg-secondary px-4 py-2 text-sm font-black text-text-primary disabled:bg-surface"
                      >
                        {completed ? "Done" : "Claim"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-surface p-3 text-sm text-text-secondary">
            <Clock size={16} />
            Mock test energy has a 10 minute cooldown.
          </div>
        </article>

        <article className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <Award className="text-primary" />
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-text-secondary">My Subjects</p>
              <h2 className="text-2xl font-black text-text-primary">Continue learning</h2>
            </div>
          </div>

          {subjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 rounded-full bg-surface p-4 text-text-muted">
                <Target size={40} />
              </div>
              <h3 className="text-xl font-black text-text-primary">No Subjects Yet</h3>
              <p className="mt-2 max-w-xs text-sm text-text-secondary">
                Generate your first AI-powered subject to begin learning.
              </p>
              <Link
                to="/forge"
                className="mt-6 inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 font-black text-text-primary shadow-sm transition hover:bg-secondary"
              >
                Open Forge
              </Link>
            </div>
          ) : (
            <div className="grid gap-3">
              {subjects.map((subject) => {
                const subjectLessons = lessons.filter((l) => l.subjectId === subject.id);
                const completedLessons = subjectLessons.filter((l) => l.completed);
                const progress = subjectLessons.length
                  ? Math.round((completedLessons.length / subjectLessons.length) * 100)
                  : 0;
                const xp = completedLessons.reduce((sum, l) => sum + (l.xpEarned || 0), 0);
                const firstIncomplete = subjectLessons.find((l) => !l.completed);
                const currentUnit = firstIncomplete
                  ? units.find((u) => u.id === firstIncomplete.unitId)?.title || "Unit 1"
                  : "Completed";

                return (
                  <Link
                    key={subject.id}
                    to="/forge"
                    className="group flex items-center justify-between gap-3 rounded-lg border border-border p-4 text-left transition hover:border-primary hover:bg-surface/50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-black text-text-primary">{subject.title}</span>
                        {progress === 100 && (
                          <CheckCircle2 size={16} className="shrink-0 text-status-success" />
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-text-secondary">
                        <span className="flex items-center gap-1">
                          <Target size={12} /> {currentUnit}
                        </span>
                        <span className="flex items-center gap-1">
                          <Zap size={12} /> {xp} XP
                        </span>
                        <span className="flex items-center gap-1">
                          <Award size={12} /> {progress}%
                        </span>
                      </div>
                      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface">
                        <div
                          className="h-full bg-primary transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                    <div className="shrink-0">
                      <button
                        type="button"
                        className="rounded-lg bg-secondary px-4 py-2 text-xs font-black text-text-primary transition group-hover:bg-primary"
                      >
                        Continue
                      </button>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
          <div className="mt-4 rounded-lg bg-gradient-to-r from-surface to-card p-4">
            <div className="flex items-center gap-2 font-black text-text-primary">
              <Zap size={18} />
              Total score = XP + (Energy x 100)
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
