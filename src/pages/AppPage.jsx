import { Award, CheckCircle2, Clock, Flame, Target, Trophy, Zap } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { StatCard } from "../components/StatCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { TESTS, UNITS, completeMockTest, completeUnit } from "../services/userService.js";

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
  const [scoreInputs, setScoreInputs] = useState(() =>
    TESTS.reduce((acc, test) => ({ ...acc, [test.id]: 75 }), {}),
  );
  const [status, setStatus] = useState("");
  const [busyId, setBusyId] = useState("");
  const score = scoreBreakdown(profile);

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

  async function finishUnit(unitId) {
    setBusyId(unitId);
    setStatus("");
    try {
      const result = await completeUnit(user.uid, unitId);
      setStatus(`Unit complete: +${result.earnedEnergy} energy and +${result.earnedXp} XP.`);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-blue-600 to-cyan-400 p-6 text-white">
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
        <p className="rounded-lg border border-cyan-100 bg-cyan-50 p-3 text-sm font-bold text-cyan-900">
          Firebase is not configured. Add env values and restart the dev server to enable dashboard actions.
        </p>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="XP" value={score.xp.toLocaleString()} helper="Learning progress" tone="bg-white" />
        <StatCard label="Energy" value={String(score.energy)} helper="1 Energy = 100 XP" tone="bg-cyan-50" />
        <StatCard label="Total Score" value={score.totalScore.toLocaleString()} helper="XP + Energy bonus" tone="bg-blue-50" />
        <StatCard
          label="Completed"
          value={`${profile?.completedTests?.length || 0}/${TESTS.length}`}
          helper="Mock tests awarded"
          tone="bg-white"
        />
      </section>

      {status ? <p className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm font-bold text-blue-800">{status}</p> : null}

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <Target className="text-blue-600" />
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
            <Award className="text-cyan-600" />
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Units</p>
              <h2 className="text-2xl font-black">Complete once</h2>
            </div>
          </div>
          <div className="grid gap-3">
            {UNITS.map((unit) => {
              const completed = profile?.completedUnits?.includes(unit.id);
              return (
                <button
                  key={unit.id}
                  type="button"
                  disabled={completed || busyId === unit.id}
                  onClick={() => finishUnit(unit.id)}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-4 text-left transition hover:border-cyan-300 disabled:bg-slate-50"
                >
                  <span>
                    <span className="block font-black">{unit.title}</span>
                    <span className="mt-1 block text-sm text-slate-500">+1 energy &bull; +{unit.xp} XP</span>
                  </span>
                  {completed ? <CheckCircle2 className="text-cyan-600" /> : <Flame className="text-slate-300" />}
                </button>
              );
            })}
          </div>
          <div className="mt-4 rounded-lg bg-gradient-to-r from-blue-50 to-cyan-50 p-4">
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
