import { Award, BookOpen, Search, ShieldCheck, Trophy, Users, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { httpsCallable } from "firebase/functions";
import { StatCard } from "../components/StatCard.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { functions } from "../config/firebase.js";
import {
  adjustUserEnergy,
  adjustUserXp,
  fetchAllForgeSubjects,
  getAdminOverview,
  grantLeaderboardReward,
  moderateForgeSubject,
  searchUsers,
  setUserTotalScore,
} from "../services/adminService.js";
import { calculateTotalScore } from "../services/userService.js";
import { canAccessAdmin } from "../utils/permissions.js";

export function AdminPage() {
  const { isFirebaseConfigured, profile, user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [forgeContent, setForgeContent] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [xpDelta, setXpDelta] = useState(100);
  const [energyDelta, setEnergyDelta] = useState(1);
  const [totalScoreInput, setTotalScoreInput] = useState("");
  const [rewardXp, setRewardXp] = useState(100);
  const [rewardEnergy, setRewardEnergy] = useState(1);
  const [rewardReason, setRewardReason] = useState("Manual reward event");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const isAdmin = canAccessAdmin(profile, user?.email);
  const [serverVerified, setServerVerified] = useState(false);

  useEffect(() => {
    if (!isAdmin || !isFirebaseConfigured || !functions) return;
    const check = httpsCallable(functions, "verifyAdminAccess");
    check().then(() => {
      setServerVerified(true);
      getAdminOverview().then(setOverview).catch(() => setOverview({ available: false }));
      searchUsers("").then(setUsers).catch(() => setUsers([]));
      fetchAllForgeSubjects().then(setForgeContent).catch(() => setForgeContent([]));
    }).catch(() => {
      setServerVerified(false);
    });
  }, [isAdmin, isFirebaseConfigured]);

  if (!isAdmin) {
    return <Navigate to="/app" replace />;
  }

  if (!serverVerified) {
    return (
      <main className="grid min-h-screen place-items-center bg-background text-text-primary">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </main>
    );
  }

  const selectedUser = users.find((item) => item.id === selectedUserId);

  async function runSearch() {
    setBusy(true);
    setStatus("");
    try {
      const results = await searchUsers(searchTerm);
      setUsers(results);
      setStatus(`Found ${results.length} users.`);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function runXpAdjust(sign) {
    if (!selectedUserId) return setStatus("Select a user first.");
    setBusy(true);
    try {
      const result = await adjustUserXp(selectedUserId, sign * Number(xpDelta || 0));
      setStatus(`XP updated. New total score: ${result.totalScore.toLocaleString()}.`);
      setUsers(await searchUsers(searchTerm));
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function runEnergyAdjust(sign) {
    if (!selectedUserId) return setStatus("Select a user first.");
    setBusy(true);
    try {
      const result = await adjustUserEnergy(selectedUserId, sign * Number(energyDelta || 0));
      setStatus(`Energy updated. New total score: ${result.totalScore.toLocaleString()}.`);
      setUsers(await searchUsers(searchTerm));
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function runTotalScoreSet() {
    if (!selectedUserId) return setStatus("Select a user first.");
    setBusy(true);
    try {
      const result = await setUserTotalScore(selectedUserId, Number(totalScoreInput || 0));
      setStatus(`Total score set to ${result.totalScore.toLocaleString()}.`);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function runRewardEvent() {
    if (!selectedUserId) return setStatus("Select a user first.");
    setBusy(true);
    try {
      const result = await grantLeaderboardReward(selectedUserId, {
        xp: Number(rewardXp || 0),
        energy: Number(rewardEnergy || 0),
        reason: rewardReason,
      });
      setStatus(`Reward applied. New total score: ${result.totalScore.toLocaleString()}.`);
      setUsers(await searchUsers(searchTerm));
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeForgeSubject(userId, subjectId) {
    setBusy(true);
    try {
      await moderateForgeSubject(userId, subjectId);
      setForgeContent(await fetchAllForgeSubjects());
      setStatus("Forge subject removed.");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="bg-gradient-to-r from-secondary to-primary p-6 text-white">
          <div className="flex items-center gap-3">
            <ShieldCheck size={24} />
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-white/75">Admin</p>
              <h1 className="text-4xl font-black tracking-tight">Administration panel</h1>
            </div>
          </div>
          <p className="mt-3 max-w-2xl text-white/85">
            Manage users, adjust rewards and progress, moderate Forge content, and run leaderboard events.
          </p>
        </div>
      </section>

      {!isFirebaseConfigured ? (
        <p className="rounded-lg border border-warning/20 bg-warning/10 p-3 text-sm font-bold text-warning">
          Firebase is required for admin actions.
        </p>
      ) : null}

      {status ? <p className="rounded-lg border border-info/20 bg-info/10 p-3 text-sm font-bold text-info">{status}</p> : null}

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Users loaded" value={users.length} helper="Search results" tone="bg-surface" />
        <StatCard label="Forge subjects" value={forgeContent.length} helper="Across all users" tone="bg-info/10" />
        <StatCard
          label="Top score"
          value={overview?.topUsers?.[0]?.totalScore?.toLocaleString() || "-"}
          helper="Leaderboard leader"
          tone="bg-warning/10"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <article className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <Users className="text-primary" />
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-text-secondary">User management</p>
              <h2 className="text-2xl font-black">Search users</h2>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by name or email..."
              className="min-w-0 flex-1 rounded-lg border border-border px-3 py-2 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/50"
            />
            <button
              type="button"
              disabled={busy}
              onClick={runSearch}
              className="inline-flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-black text-white disabled:bg-text-muted"
            >
              <Search size={16} />
              Search
            </button>
          </div>

          <div className="mt-4 max-h-72 overflow-auto rounded-lg border border-border">
            {users.length ? (
              users.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedUserId(item.id);
                    setTotalScoreInput(String(item.totalScore || calculateTotalScore(item)));
                  }}
                  className={`flex w-full items-center justify-between gap-3 border-b border-border/50 px-3 py-3 text-left last:border-b-0 ${
                    selectedUserId === item.id ? "bg-primary/10" : "bg-surface"
                  }`}
                >
                  <span>
                    <span className="block font-black">{item.name || "Unnamed"}</span>
                    <span className="block text-xs text-text-secondary">{item.email}</span>
                  </span>
                  <span className="text-right text-xs font-bold text-text-secondary">
                    XP {item.xp || 0}
                    <br />
                    Energy {item.energy || 0}
                  </span>
                </button>
              ))
            ) : (
              <EmptyState title="No users" copy="Search to load users from Firestore." />
            )}
          </div>
        </article>

        <article className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <Zap className="text-warning" />
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-text-secondary">Rewards & progress</p>
              <h2 className="text-2xl font-black">Adjust selected user</h2>
            </div>
          </div>

          {selectedUser ? (
            <p className="mb-4 rounded-lg bg-background p-3 text-sm">
              <strong>{selectedUser.name}</strong> - XP {selectedUser.xp || 0}, Energy {selectedUser.energy || 0},
              Total {selectedUser.totalScore || calculateTotalScore(selectedUser)}
            </p>
          ) : (
            <p className="mb-4 text-sm text-text-secondary">Select a user to adjust rewards.</p>
          )}

          <div className="grid gap-4">
            <div className="rounded-lg border border-border p-3">
              <p className="text-sm font-black">XP</p>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  value={xpDelta}
                  onChange={(event) => setXpDelta(event.target.value)}
                  className="w-24 rounded-lg border border-border px-3 py-2 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/50"
                />
                <button type="button" disabled={busy} onClick={() => runXpAdjust(1)} className="rounded-lg bg-primary px-3 py-2 text-sm font-black text-white">
                  Add XP
                </button>
                <button type="button" disabled={busy} onClick={() => runXpAdjust(-1)} className="rounded-lg border border-border px-3 py-2 text-sm font-bold">
                  Remove XP
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-border p-3">
              <p className="text-sm font-black">Energy</p>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  value={energyDelta}
                  onChange={(event) => setEnergyDelta(event.target.value)}
                  className="w-24 rounded-lg border border-border px-3 py-2 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/50"
                />
                <button type="button" disabled={busy} onClick={() => runEnergyAdjust(1)} className="rounded-lg bg-warning px-3 py-2 text-sm font-black text-white">
                  Add Energy
                </button>
                <button type="button" disabled={busy} onClick={() => runEnergyAdjust(-1)} className="rounded-lg border border-border px-3 py-2 text-sm font-bold">
                  Remove Energy
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-border p-3">
              <p className="text-sm font-black">Total score override</p>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  value={totalScoreInput}
                  onChange={(event) => setTotalScoreInput(event.target.value)}
                  className="w-32 rounded-lg border border-border px-3 py-2 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/50"
                />
                <button type="button" disabled={busy} onClick={runTotalScoreSet} className="rounded-lg bg-secondary px-3 py-2 text-sm font-black text-white">
                  Set total score
                </button>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <article className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <Trophy className="text-primary" />
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-text-secondary">Leaderboard</p>
              <h2 className="text-2xl font-black">Reward events</h2>
            </div>
          </div>

          <div className="grid gap-3">
            <input
              type="number"
              value={rewardXp}
              onChange={(event) => setRewardXp(event.target.value)}
              className="rounded-lg border border-border px-3 py-2 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/50"
              placeholder="XP to grant"
            />
            <input
              type="number"
              value={rewardEnergy}
              onChange={(event) => setRewardEnergy(event.target.value)}
              className="rounded-lg border border-border px-3 py-2 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/50"
              placeholder="Energy to grant"
            />
            <input
              value={rewardReason}
              onChange={(event) => setRewardReason(event.target.value)}
              className="rounded-lg border border-border px-3 py-2 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/50"
              placeholder="Reason"
            />
            <button
              type="button"
              disabled={busy}
              onClick={runRewardEvent}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary to-warning px-4 py-3 font-black text-white disabled:opacity-50"
            >
              <Award size={18} />
              Grant reward event
            </button>
          </div>

          {overview?.topUsers?.length ? (
            <div className="mt-5">
              <p className="text-sm font-bold uppercase tracking-widest text-text-secondary">Top leaderboard</p>
              <div className="mt-2 grid gap-2">
                {overview.topUsers.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                    <span className="font-black">
                      #{entry.rank} {entry.name}
                    </span>
                    <span className="font-bold text-primary">{entry.totalScore?.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </article>

        <article className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <BookOpen className="text-warning" />
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-text-secondary">Content</p>
              <h2 className="text-2xl font-black">Forge moderation</h2>
            </div>
          </div>

          <div className="max-h-96 overflow-auto rounded-lg border border-border">
            {forgeContent.length ? (
              forgeContent.map((entry) => (
                <div key={`${entry.userId}-${entry.subject.id}`} className="border-b border-border/50 px-3 py-3 last:border-b-0">
                  <p className="font-black">{entry.subject.title}</p>
                  <p className="text-xs text-text-secondary">
                    {entry.userName} &bull; {entry.userEmail}
                  </p>
                  <p className="mt-1 text-sm text-text-secondary">
                    {entry.subject.units?.length || 0} units &bull;{" "}
                    {entry.subject.units?.reduce((acc, unit) => acc + (unit.subUnits?.length || 0), 0) || 0} sub-units
                  </p>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => removeForgeSubject(entry.userId, entry.subject.id)}
                    className="mt-2 rounded-lg border border-error/20 px-3 py-1 text-xs font-bold text-error"
                  >
                    Remove subject
                  </button>
                </div>
              ))
            ) : (
              <EmptyState title="No Forge content" copy="Generated Forge subjects will appear here." />
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
