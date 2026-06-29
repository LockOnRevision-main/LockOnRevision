import { Medal, RefreshCcw, Trophy, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { getTopLeaderboardUsers } from "../services/leaderboardService.js";

export function LeaderboardPage() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadLeaders() {
    setLoading(true);
    setError("");
    try {
      setLeaders(await getTopLeaderboardUsers());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLeaders();
  }, []);

  return (
    <div className="grid gap-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-indigo-600">Leaderboard</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight">Top learners</h1>
            <p className="mt-2 flex items-center gap-2 text-sm font-bold text-slate-500">
              <Zap size={16} className="text-amber-500" />
              1 Energy = 100 XP
            </p>
          </div>
          <button
            type="button"
            onClick={loadLeaders}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 font-black text-slate-700 shadow-sm"
          >
            <RefreshCcw size={17} />
            Refresh
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[80px_1fr_160px] gap-3 bg-slate-50 px-4 py-3 text-sm font-black text-slate-500">
          <span>Rank</span>
          <span>Name</span>
          <span className="text-right">Total Score</span>
        </div>

        {loading ? <p className="p-6 text-sm font-bold text-slate-500">Loading leaderboard...</p> : null}
        {error ? <p className="p-6 text-sm font-bold text-red-700">{error}</p> : null}
        {!loading && !error && leaders.length === 0 ? (
          <p className="p-6 text-sm font-bold text-slate-500">
            No leaderboard entries are available. Firebase is paused, and no mock users are shown.
          </p>
        ) : null}

        {leaders.map((leader) => {
          const xp = Number(leader.xp || 0);
          const energy = Number(leader.energy || 0);
          const total = Number(leader.totalScore || xp + energy * 100);
          return (
            <article
              key={leader.id}
              className="grid grid-cols-[80px_1fr_160px] items-center gap-3 border-t border-slate-100 px-4 py-4"
            >
              <div className="flex items-center gap-2 font-black">
                {leader.rank <= 3 ? <Medal className="text-amber-500" size={18} /> : <Trophy className="text-slate-300" size={18} />}
                {leader.rank}
              </div>
              <div>
                <p className="font-black">{leader.name || "LockOn Learner"}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {xp.toLocaleString()} XP + {energy} energy
                </p>
              </div>
              <p className="text-right text-lg font-black text-blue-700">{total.toLocaleString()} pts</p>
            </article>
          );
        })}
      </section>
    </div>
  );
}
