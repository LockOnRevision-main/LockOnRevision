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
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-indigo-600 to-amber-400 p-6 text-white">
          <p className="text-sm font-bold uppercase tracking-widest text-white/75">Dashboard</p>
          <div className="mt-2 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h1 className="text-4xl font-black tracking-tight">Welcome, {profile?.name || "Learner"}</h1>
              <p className="mt-2 max-w-2xl text-white/85">Gain XP, earn energy, and climb the leaderboard.</p>
            </div>
            <Link
              to="/leaderboard"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 font-black text-blue-700 shadow-sm"
            >
              <Trophy size={18} />
              Leaderboard
            </Link>
          </div>
        </div>
      </section>

      {!isFirebaseConfigured ? (
        <p className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-sm font-bold text-amber-900">
          Firebase is not configured. Add env values and restart the dev server to enable dashboard actions.
        </p>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="XP" value={score.xp.toLocaleString()} helper="Learning progress" tone="bg-white" />
        <StatCard label="Energy" value={String(score.energy)} helper="1 Energy = 100 XP" tone="bg-amber-50" />
        <StatCard label="Total Score" value={score.totalScore.toLocaleString()} helper="XP + Energy bonus" tone="bg-indigo-50" />
        <StatCard
          label="Completed"
          value={`${profile?.completedTests?.length || 0}/${TESTS.length}`}
          helper="Mock tests awarded"
          tone="bg-white"
        />
      </section>

      {status ? <p className="rounded-lg border border-blue-100 bg-indigo-50 p-3 text-sm font-bold text-blue-800">{status}</p> : null}

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <Target className="text-indigo-600" />
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Mock tests</p>
              <h2 className="text-2xl font-black">Earn controlled energy</h2>
            </div>
          </div>
          <div className="grid gap-3">
            {TESTS.map((test) => {
              const completed = profile?.completedTests?.includes(test.id);
              return (
                <div key={test.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                    <div>
                      <p className="font-black">{test.title}</p>
                      <p className="mt-1 text-sm text-slate-500">
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
                        className="w-20 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold outline-none focus:border-blue-400"
                        aria-label={`${test.title} score`}
                      />
                      <button
                        type="button"
                        disabled={completed || busyId === test.id}
                        onClick={() => runTest(test.id)}
                        className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-black text-white disabled:bg-slate-300"
                      >
                        {completed ? "Done" : "Claim"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            <Clock size={16} />
            Mock test energy has a 10 minute cooldown.
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <Award className="text-amber-600" />
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-slate-500">My Subjects</p>
              <h2 className="text-2xl font-black">Continue learning</h2>
            </div>
          </div>

          {subjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 rounded-full bg-slate-100 p-4 text-slate-400">
                <Target size={40} />
              </div>
              <h3 className="text-xl font-black text-slate-800">No Subjects Yet</h3>
              <p className="mt-2 max-w-xs text-sm text-slate-500">
                Generate your first AI-powered subject to begin learning.
              </p>
              <Link
                to="/forge"
                className="mt-6 inline-flex items-center justify-center rounded-lg bg-indigo-600 px-6 py-3 font-black text-white shadow-sm transition hover:bg-blue-700"
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
                    className="group flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-4 text-left transition hover:border-blue-300 hover:bg-indigo-50/50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-black text-slate-800">{subject.title}</span>
                        {progress === 100 && (
                          <CheckCircle2 size={16} className="shrink-0 text-green-500" />
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-slate-500">
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
                      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full bg-indigo-600 transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                    <div className="shrink-0">
                      <button
                        type="button"
                        className="rounded-lg bg-slate-950 px-4 py-2 text-xs font-black text-white transition group-hover:bg-indigo-600"
                      >
                        Continue
                      </button>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
          <div className="mt-4 rounded-lg bg-gradient-to-r from-indigo-50 to-amber-50 p-4">
            <div className="flex items-center gap-2 font-black text-blue-800">
              <Zap size={18} />
              Total score = XP + (Energy x 100)
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
