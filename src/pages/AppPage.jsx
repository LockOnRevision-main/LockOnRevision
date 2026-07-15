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
    <div className="grid gap-8">
      <section className="overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
        <div className="bg-gradient-to-r from-secondary to-primary p-10 text-text-primary">
          <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">Dashboard</p>
          <div className="mt-3 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="flex flex-col gap-2">
              <h1 className="text-4xl font-black tracking-tight text-text-primary">Welcome, {profile?.name || "Learner"}</h1>
              <p className="max-w-2xl text-text-primary/85 text-lg">Gain XP, earn energy, and climb the leaderboard.</p>
            </div>
            <Link
              to="/leaderboard"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-secondary px-6 py-3 font-black text-white shadow-lg transition-all hover:scale-105 active:scale-95"
            >
              <Trophy size={18} />
              Leaderboard
            </Link>
          </div>
        </div>
      </section>

      {!isFirebaseConfigured ? (
        <p className="rounded-xl border border-border bg-card p-4 text-sm font-bold text-text-primary shadow-sm">
          Firebase is not configured. Add env values and restart the dev server to enable dashboard actions.
        </p>
      ) : null}

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
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

      {status ? <p className="rounded-xl border border-border bg-surface p-4 text-sm font-bold text-text-primary shadow-sm">{status}</p> : null}

      <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-3xl border border-border bg-surface p-8 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1">
           <div className="mb-8 flex items-center gap-4">
             <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
               <Target size={24} />
             </div>
             <div>
               <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">Mock tests</p>
               <h2 className="text-2xl font-black tracking-tight text-text-primary">Earn controlled energy</h2>
             </div>
           </div>
           <div className="grid gap-5">
             {TESTS.map((test) => {
               const completed = profile?.completedTests?.includes(test.id);
               return (
                 <div key={test.id} className="rounded-2xl border border-border bg-background p-5 transition-all duration-200 hover:border-primary/50 hover:bg-surface/50">
                   <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                     <div className="flex flex-col gap-1">
                       <p className="font-black text-text-primary text-lg tracking-tight">{test.title}</p>
                       <p className="text-sm text-text-secondary">
                         {test.difficulty} &bull; +{test.energy} energy &bull; +{test.xp} XP &bull; requires 60%+
                       </p>
                     </div>
                     <div className="flex items-center gap-4">
                       <input
                         type="number"
                         min="0"
                         max="100"
                         value={scoreInputs[test.id]}
                         onChange={(event) => setScoreInputs({ ...scoreInputs, [test.id]: event.target.value })}
                         className="w-24 rounded-xl border border-border px-3 py-2 text-sm font-bold outline-none focus:border-primary bg-transparent text-text-primary transition-all"
                         aria-label={`${test.title} score`}
                       />
                       <button
                         type="button"
                         disabled={completed || busyId === test.id}
                         onClick={() => runTest(test.id)}
                         className="rounded-xl bg-primary px-6 py-2 text-sm font-black text-white transition-all duration-150 active:scale-95 hover:bg-primary-active disabled:bg-background disabled:text-text-muted"
                       >
                         {completed ? "Done" : "Claim"}
                       </button>
                     </div>
                   </div>
                 </div>
               );
             })}
           </div>
           <div className="mt-8 flex items-center gap-3 rounded-xl bg-background p-4 text-sm text-text-secondary border border-border">
             <Clock size={16} className="text-primary" />
             Mock test energy has a 10 minute cooldown.
           </div>
         </article>


        <article className="rounded-3xl border border-border bg-surface p-8 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1">
           <div className="mb-8 flex items-center gap-4">
             <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
               <Award size={24} />
             </div>
             <div>
               <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">My Subjects</p>
               <h2 className="text-2xl font-black tracking-tight text-text-primary">Continue learning</h2>
             </div>
           </div>
 
           {subjects.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-16 text-center">
               <div className="mb-6 rounded-full bg-background p-6 text-text-muted border border-border">
                 <Target size={48} />
               </div>
               <h3 className="text-2xl font-black text-text-primary">No Subjects Yet</h3>
               <p className="mt-3 max-w-xs text-sm text-text-secondary leading-relaxed">
                 Generate your first AI-powered subject to begin learning.
               </p>
                <Link
                  to="/forge"
                  className="mt-8 inline-flex items-center justify-center rounded-xl bg-secondary px-8 py-3 font-black text-white shadow-lg transition-all hover:bg-primary hover:scale-105 active:scale-95"
                >
                  Open Forge
                </Link>
 
             </div>
           ) : (
             <div className="grid gap-5">
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
                     className="group flex items-center justify-between gap-4 rounded-2xl border border-border p-5 text-left transition-all hover:border-primary hover:bg-background shadow-sm"
                   >
                     <div className="flex-1 min-w-0">
                       <div className="flex items-center gap-2">
                         <span className="truncate font-black text-text-primary text-lg">{subject.title}</span>
                         {progress === 100 && (
                           <CheckCircle2 size={16} className="shrink-0 text-status-success" />
                         )}
                       </div>
                       <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold text-text-secondary">
                         <span className="flex items-center gap-1.5">
                           <Target size={12} className="text-primary" /> {currentUnit}
                         </span>
                          <span className="flex items-center gap-1.5">
                            <Zap size={12} className="text-warning" /> {xp} XP
                          </span>
 
                         <span className="flex items-center gap-1.5">
                           <Award size={12} className="text-primary" /> {progress}%
                         </span>
                       </div>
                       <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-background border border-border">
                         <div
                           className="h-full bg-primary transition-all duration-500"
                           style={{ width: `${progress}%` }}
                         />
                       </div>
                     </div>
                     <div className="shrink-0">
                        <button
                          type="button"
                          className="rounded-xl bg-primary px-5 py-2.5 text-xs font-black text-white transition-all duration-150 active:scale-95 group-hover:bg-primary-active shadow-sm"
                        >
                          Continue
                        </button>
 
                     </div>
                   </Link>
                 );
               })}
             </div>
           )}
            <div className="mt-8 rounded-2xl bg-gradient-to-r from-surface to-card p-6 border border-border shadow-sm">
              <div className="flex items-center gap-3 font-black text-text-primary">
                <Zap size={20} className="text-warning" />
                Total score = XP + (Energy x 100)
              </div>
            </div>
         </article>

      </section>
    </div>
  );
}
