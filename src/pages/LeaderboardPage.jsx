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
    <div className="grid gap-8">
      <section className="rounded-3xl border border-border bg-surface p-8 shadow-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary">Leaderboard</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-text-primary">Top learners</h1>
             <p className="mt-2 flex items-center gap-2 text-sm font-bold text-text-secondary">
               <Zap size={16} className="text-warning" />
               1 Energy = 100 XP
             </p>

          </div>
          <button
            type="button"
            onClick={loadLeaders}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-5 py-3 font-black text-text-primary shadow-sm transition-all hover:bg-surface hover:border-primary active:scale-95"
          >
            <RefreshCcw size={17} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
        <div className="grid grid-cols-[80px_1fr_160px] gap-3 bg-background px-6 py-4 text-xs font-black uppercase tracking-widest text-text-muted border-b border-border">
          <span>Rank</span>
          <span>Name</span>
          <span className="text-right">Total Score</span>
        </div>

        {loading ? <p className="p-8 text-sm font-bold text-text-secondary text-center">Loading leaderboard...</p> : null}
        {error ? <p className="p-8 text-sm font-bold text-status-error text-center">{error}</p> : null}
        {!loading && !error && leaders.length === 0 ? (
          <p className="p-8 text-sm font-bold text-text-secondary text-center">
            No leaderboard entries are available. Firebase is paused, and no mock users are shown.
          </p>
        ) : null}

        <div className="divide-y divide-border">
          {leaders.map((leader, index) => {
            const rank = index + 1;
            const xp = Number(leader.xp || 0);
            const energy = Number(leader.energy || 0);
            const total = Number(leader.totalScore || xp + energy * 100);
            return (
              <article
                key={leader.id}
                className="grid grid-cols-[80px_1fr_160px] items-center gap-3 px-6 py-5 transition-all hover:bg-background/50"
              >
                 <div className="flex items-center gap-2 font-black text-text-primary">
                   {rank <= 3 ? <Medal className="text-warning" size={18} /> : <Trophy className="text-text-muted" size={18} />}
                   {rank}
                 </div>

                <div>
                  <p className="font-black text-text-primary text-lg">{leader.name || "LockOn Learner"}</p>
                  <p className="mt-1 text-xs font-medium text-text-secondary">
                    {xp.toLocaleString()} XP + {energy} energy
                  </p>
                </div>
                <p className="text-right text-xl font-black text-primary">{total.toLocaleString()} pts</p>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
