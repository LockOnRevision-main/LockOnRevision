import { Medal, Trophy } from "lucide-react";

function buildPreviewEntries(users, currentUserId) {
  if (!users.length) return [];

  const currentUser = users.find((u) => u.id === currentUserId);
  const top3 = users.slice(0, 3);
  const usedIds = new Set();

  if (!currentUser) return top3;

  const currentRank = currentUser._rank;

  usedIds.add(currentUserId);

  if (currentRank <= 3) {
    const result = [];
    for (const u of users) {
      if (result.length >= 5) break;
      if (u.id === currentUserId) {
        result.push({ ...u, _isCurrentUser: true });
        usedIds.add(u.id);
      } else if (!usedIds.has(u.id)) {
        result.push(u);
        usedIds.add(u.id);
      }
    }
    return result;
  }

  const uIdx = users.findIndex((u) => u.id === currentUserId);
  let contextEntries = [];
  const above = uIdx > 0 ? users[uIdx - 1] : null;
  const below = uIdx < users.length - 1 ? users[uIdx + 1] : null;
  const above2 = uIdx > 1 ? users[uIdx - 2] : null;
  const below2 = uIdx < users.length - 2 ? users[uIdx + 2] : null;

  if (uIdx <= 1) {
    for (let i = 0; i < Math.min(5, users.length); i++) {
      contextEntries.push(users[i]);
    }
  } else if (uIdx >= users.length - 2) {
    for (let i = Math.max(0, users.length - 5); i < users.length; i++) {
      contextEntries.push(users[i]);
    }
  } else {
    contextEntries = [];
    if (above2 && above2._rank !== currentRank) contextEntries.push(above2);
    if (above && above._rank !== currentRank) contextEntries.push(above);
    contextEntries.push(currentUser);
    if (below && below._rank !== currentRank) contextEntries.push(below);
    if (below2 && below2._rank !== currentRank) contextEntries.push(below2);
  }

  const result = [];
  const seen = new Set();
  for (const u of contextEntries) {
    if (seen.has(u.id)) continue;
    seen.add(u.id);
    result.push(u.id === currentUserId ? { ...u, _isCurrentUser: true } : u);
  }

  return result;
}

export function LeaderboardPreview({ users, currentUserId }) {
  const previewEntries = buildPreviewEntries(users, currentUserId);

  if (!previewEntries.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Medal size={36} className="text-text-muted" />
        <p className="mt-3 text-sm font-bold text-text-secondary">No ranks available</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border rounded-xl border border-border bg-background">
      {previewEntries.map((entry) => {
        const rank = entry._rank;
        const xp = Number(entry.xp || 0);
        const energy = Number(entry.energy || 0);
        const total = Number(entry._score) || Number(entry.totalScore || xp + energy * 100);
        const isCurrentUser = entry._isCurrentUser;

        return (
          <div
            key={entry.id}
            className={`flex items-center gap-3 px-4 py-3.5 transition-all ${
              isCurrentUser
                ? "bg-primary/5 ring-1 ring-inset ring-primary/30"
                : ""
            }`}
          >
            <div className="flex w-8 shrink-0 items-center justify-center font-black text-text-primary text-sm">
              {rank <= 3 ? <Medal className="text-warning" size={16} /> : <Trophy className="text-text-muted" size={14} />}
              <span className="ml-1">{rank}</span>
            </div>

            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 truncate text-sm font-black text-text-primary">
                {entry.name || entry.email?.split("@")[0] || "Learner"}
                {isCurrentUser ? (
                  <span className="shrink-0 inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary">
                    You
                  </span>
                ) : null}
              </p>
              <p className="mt-0.5 text-xs text-text-muted">
                {xp.toLocaleString()} XP + {energy} energy
              </p>
            </div>

            <div className="shrink-0 text-right">
              <span className="text-sm font-black text-primary">{total.toLocaleString()}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
