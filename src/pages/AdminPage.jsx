import { useTranslation } from "react-i18next";
import { Award, BarChart3, BookOpen, Search, ShieldCheck, Trophy, Users, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { httpsCallable } from "firebase/functions";
import { StatCard } from "../components/StatCard.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { TrendBars } from "../components/TrendBars.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { functions } from "../config/firebase.js";
import {
  adjustUserEnergy,
  adjustUserXp,
  fetchAllForgeSubjects,
  getAdminOverview,
  getPlatformAnalytics,
  getUserAnalytics,
  grantLeaderboardReward,
  moderateForgeSubject,
  searchUsers,
  setUserTotalScore,
} from "../services/adminService.js";
import { calculateTotalScore } from "../services/userService.js";
import { canAccessAdmin } from "../utils/permissions.js";

/** Cached across tab switches so the panel never refetches on revisit. */
let platformCache = null;

function fmt(value) {
  if (value === null || value === undefined) return "—";
  return Number(value).toLocaleString();
}

function AdminAnalyticsPanel({ t, selectedUserId }) {
  const [platform, setPlatform] = useState(platformCache);
  const [platformLoading, setPlatformLoading] = useState(!platformCache);
  const [platformError, setPlatformError] = useState("");
  const [userStats, setUserStats] = useState(null);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState("");

  useEffect(() => {
    if (platformCache) return;
    let cancelled = false;
    setPlatformLoading(true);
    getPlatformAnalytics()
      .then((data) => {
        if (cancelled) return;
        platformCache = data;
        setPlatform(data);
      })
      .catch((err) => { if (!cancelled) setPlatformError(err.message); })
      .finally(() => { if (!cancelled) setPlatformLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedUserId) {
      setUserStats(null);
      setUserError("");
      return;
    }
    let cancelled = false;
    setUserLoading(true);
    setUserError("");
    getUserAnalytics(selectedUserId)
      .then((data) => { if (!cancelled) setUserStats(data); })
      .catch((err) => { if (!cancelled) setUserError(err.message); })
      .finally(() => { if (!cancelled) setUserLoading(false); });
    return () => { cancelled = true; };
  }, [selectedUserId]);

  return (
    <div className="grid gap-4">
      <section className="card card-pad" aria-label={t("admin.platform_overview")}>
        <div className="section-head">
          <div className="flex items-center gap-3">
            <span className="icon-tile" style={{ width: "2.25rem", height: "2.25rem" }}><BarChart3 size={17} /></span>
            <div>
              <p className="eyebrow">{t("admin.analytics_tab")}</p>
              <h2 className="mt-0.5 text-text-primary">{t("admin.platform_overview")}</h2>
            </div>
          </div>
        </div>
        <p className="mb-4 text-[13px] text-text-secondary">{t("admin.platform_desc")}</p>
        {platformLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" role="status" aria-label={t("common.loading")}>
            {[0, 1, 2, 3].map((i) => (<div key={i} className="skeleton h-24 w-full !rounded-2xl" />))}
          </div>
        ) : platformError ? (
          <p className="alert alert-error" role="alert">{platformError}</p>
        ) : platform ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 [&>*]:min-w-0">
            <StatCard label={t("admin.total_users")} value={fmt(platform.totalUsers)} icon={<Users size={16} />} />
            <StatCard label={t("admin.active_today")} value={fmt(platform.activeToday)} icon={<Zap size={16} />} />
            <StatCard label={t("admin.active_7d")} value={fmt(platform.active7d)} icon={<Zap size={16} />} />
            <StatCard label={t("admin.challenge_today")} value={fmt(platform.challengeToday)} helper={t("admin.challenge_today_helper")} icon={<Trophy size={16} />} />
            <StatCard label={t("admin.lessons_total")} value={fmt(platform.lessonsTotal)} icon={<BookOpen size={16} />} />
            <StatCard label={t("admin.hours_total")} value={fmt(platform.hoursTotal)} icon={<BarChart3 size={16} />} />
            <StatCard label={t("admin.avg_energy")} value={platform.avgEnergy === null ? "—" : String(platform.avgEnergy)} icon={<Award size={16} />} />
            <StatCard label={t("admin.lessons_created")} value={fmt(platform.usage?.lessons)} helper={t("admin.subjects_total")} icon={<BookOpen size={16} />} />
          </div>
        ) : null}
      </section>

      {platform?.newUsersTrend ? (
        <section className="card card-pad" aria-label={t("admin.new_users_title")}>
          <div className="section-head">
            <div>
              <p className="eyebrow">{t("admin.analytics_tab")}</p>
              <h2 className="mt-0.5 text-text-primary">{t("admin.new_users_title")}</h2>
            </div>
          </div>
          <p className="mb-4 text-[13px] text-text-secondary">{t("admin.new_users_desc")}</p>
          <TrendBars data={platform.newUsersTrend} ariaLabel={t("admin.new_users_title")} emptyText={t("admin.unavailable")} />
        </section>
      ) : null}

      <section className="card card-pad" aria-label={t("admin.user_insights")}>
        <div className="section-head">
          <div className="flex items-center gap-3">
            <span className="icon-tile" style={{ width: "2.25rem", height: "2.25rem" }}><Users size={17} /></span>
            <div>
              <p className="eyebrow">{t("admin.analytics_tab")}</p>
              <h2 className="mt-0.5 text-text-primary">{t("admin.user_insights")}</h2>
            </div>
          </div>
        </div>
        <p className="mb-4 text-[13px] text-text-secondary">{t("admin.user_insights_desc")}</p>
        {!selectedUserId ? (
          <EmptyState title={t("admin.select_user")} copy={t("admin.pick_user")} />
        ) : userLoading ? (
          <div className="grid gap-3" role="status" aria-label={t("common.loading")}>
            <div className="skeleton h-6 w-1/3" />
            <div className="skeleton h-16 w-full !rounded-xl" />
            <div className="skeleton h-16 w-full !rounded-xl" />
          </div>
        ) : userError ? (
          <p className="alert alert-error" role="alert">{userError}</p>
        ) : userStats ? (
          <div className="grid gap-4">
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="font-bold text-text-primary">{userStats.profile.name || t("admin.unnamed")}</p>
              <p className="text-xs text-text-secondary">{userStats.profile.email}</p>
              <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs tabular-nums text-text-secondary">
                <span>XP {(userStats.profile.xp || 0).toLocaleString()}</span>
                <span>{t("dashboard.energy")} {userStats.profile.energy || 0}</span>
                <span>{t("dashboard.streak")}: {userStats.profile.streak || 0}</span>
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3 [&>*]:min-w-0">
              <StatCard label={t("admin.completion_rate")} value={`${userStats.progress.percent}%`} helper={`${userStats.progress.completed}/${userStats.progress.total} ${t("admin.lessons_label")}`} />
              <StatCard label={t("admin.consistency_title")} value={`${userStats.consistency.activeDays28}`} helper={`${userStats.consistency.hours28}h · ${t("admin.active_days")}`} />
              <StatCard
                label={t("admin.timetable_adherence")}
                value={userStats.adherence.percent === null ? "—" : `${userStats.adherence.percent}%`}
                helper={`${userStats.adherence.completed}/${userStats.adherence.total} ${t("admin.sessions_done")}`}
              />
            </div>
            {userStats.breakdown.length > 0 ? (
              <div className="grid gap-2">
                {userStats.breakdown.slice(0, 6).map((s) => (
                  <div key={s.id} className="flex items-center gap-3 text-[13px]">
                    <span className="w-32 truncate font-semibold text-text-secondary">{s.title}</span>
                    <div className="progress-track flex-1">
                      <div className="progress-fill" style={{ width: `${s.percent}%` }} />
                    </div>
                    <span className="w-10 text-right font-bold tabular-nums text-text-primary">{s.percent}%</span>
                  </div>
                ))}
              </div>
            ) : null}
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted">{t("admin.recent_lessons")}</p>
              {userStats.recentLessons.length ? (
                <ul className="grid gap-2">
                  {userStats.recentLessons.map((l) => (
                    <li key={l.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2 text-[13px]">
                      <span className="min-w-0 truncate font-semibold text-text-primary">
                        {l.title}
                        <span className="ml-2 font-normal text-text-muted">{l.subjectName}</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-text-secondary">
                        {l.completed ? `+${l.xpEarned} XP` : "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-text-muted">{t("admin.no_recent")}</p>
              )}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

export function AdminPage() {
  const { t } = useTranslation();
  const { isFirebaseConfigured, profile } = useAuth();
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
  const [rewardReason, setRewardReason] = useState(t("admin_page.manual_reward_event"));
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState("manage");

  const isAdmin = canAccessAdmin(profile);
  const [serverVerified, setServerVerified] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    // Local demo mode has no backend to verify against — trust the local
    // profile (consistent with the rest of demo mode) so admins can explore.
    if (!isFirebaseConfigured) {
      setUsingFallback(true);
      setServerVerified(true);
      getAdminOverview().then(setOverview).catch(() => setOverview({ available: false }));
      searchUsers("").then(setUsers).catch(() => setUsers([]));
      fetchAllForgeSubjects().then(setForgeContent).catch(() => setForgeContent([]));
      return;
    }
    let cancelled = false;
    async function verify() {
      setVerifyError("");
      // Try callable first; on failure (CORS / not-found on Spark) fall back to client profile
      if (functions) {
        try {
          const check = httpsCallable(functions, "verifyAdminAccess");
          console.log("[AdminPage] verifyAdminAccess request", { hasFunctions: !!functions, isAdminClient: isAdmin });
          await check();
          if (cancelled) return;
          console.log("[AdminPage] server verification succeeded");
          setServerVerified(true);
          setUsingFallback(false);
          getAdminOverview().then(setOverview).catch(() => setOverview({ available: false }));
          searchUsers("").then(setUsers).catch(() => setUsers([]));
          fetchAllForgeSubjects().then(setForgeContent).catch(() => setForgeContent([]));
          return;
        } catch (err) {
          const code = err?.code || "";
          console.warn("[AdminPage] server verification failed, checking fallback", { code, message: err?.message });
          // For definitive server denials, don't fallback
          if (code === "permission-denied" || code === "functions/permission-denied") {
            if (!cancelled) {
              setVerifyError("You don't have permission to access this page.");
              setServerVerified(false);
            }
            return;
          }
          // Otherwise (CORS, not-found, unavailable, unauthenticated without function) fall back to client isAdmin
          // The Spark plan has no functions deployed, so 404/CORS is expected - treat as fallback success if client says admin
        }
      }
      // Fallback: trust client profile (already Firestore-backed) when server unavailable
      // Firestore rules still enforce server-side on every read/write
      if (!cancelled) {
        if (isAdmin) {
          console.log("[AdminPage] using fallback client verification (functions unavailable)");
          setUsingFallback(true);
          setServerVerified(true);
          getAdminOverview().then(setOverview).catch(() => setOverview({ available: false }));
          searchUsers("").then(setUsers).catch(() => setUsers([]));
          fetchAllForgeSubjects().then(setForgeContent).catch(() => setForgeContent([]));
        } else {
          setVerifyError("Unable to verify admin access. Please try again.");
          setServerVerified(false);
        }
      }
    }
    verify();
    return () => { cancelled = true; };
  }, [isAdmin, isFirebaseConfigured, functions]);

  if (!isAdmin) {
    return <Navigate to="/app" replace />;
  }

  if (!serverVerified) {
    if (verifyError) {
      return (
        <main className="grid min-h-[50vh] place-items-center bg-background p-6 text-text-primary">
          <div className="max-w-md rounded-xl border border-error/20 bg-error/10 p-6 text-center">
            <p className="font-black text-error">Unable to verify admin access</p>
            <p className="mt-2 text-sm text-text-secondary">{verifyError}</p>
          </div>
        </main>
      );
    }
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
      setStatus(t("admin_page.found_users", { count: results.length }));
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function runXpAdjust(sign) {
    if (!selectedUserId) return setStatus(t("admin_page.select_user_first"));
    setBusy(true);
    try {
      const result = await adjustUserXp(selectedUserId, sign * Number(xpDelta || 0));
      setStatus(t("admin_page.xp_updated", { score: result.totalScore.toLocaleString() }));
      setUsers(await searchUsers(searchTerm));
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function runEnergyAdjust(sign) {
    if (!selectedUserId) return setStatus(t("admin_page.select_user_first"));
    setBusy(true);
    try {
      const result = await adjustUserEnergy(selectedUserId, sign * Number(energyDelta || 0));
      setStatus(t("admin_page.energy_updated", { score: result.totalScore.toLocaleString() }));
      setUsers(await searchUsers(searchTerm));
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function runTotalScoreSet() {
    if (!selectedUserId) return setStatus(t("admin_page.select_user_first"));
    setBusy(true);
    try {
      const result = await setUserTotalScore(selectedUserId, Number(totalScoreInput || 0));
      setStatus(t("admin_page.score_set", { score: result.totalScore.toLocaleString() }));
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function runRewardEvent() {
    if (!selectedUserId) return setStatus(t("admin_page.select_user_first"));
    setBusy(true);
    try {
      const result = await grantLeaderboardReward(selectedUserId, {
        xp: Number(rewardXp || 0),
        energy: Number(rewardEnergy || 0),
        reason: rewardReason,
      });
      setStatus(t("admin_page.reward_applied", { score: result.totalScore.toLocaleString() }));
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
      setStatus(t("admin_page.forge_subject_removed"));
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-w-0 grid-cols-1 gap-6 [&>*]:min-w-0">
      <section className="card overflow-hidden">
        <div className="p-6" style={{ background: "var(--color-secondary)" }}>
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/12 text-white"><ShieldCheck size={20} /></span>
            <div>
              <p className="eyebrow !text-white/60">{t("nav.admin")}</p>
              <h1 className="text-white">{t("admin.title")}</h1>
            </div>
          </div>
          <p className="mt-3 max-w-2xl text-sm text-white/75">{t("admin.description")}</p>
        </div>
      </section>

      {!isFirebaseConfigured ? (
        <p className="rounded-lg border border-warning/20 bg-warning/10 p-3 text-sm font-bold text-warning">{t("admin.firebase_required")}</p>
      ) : null}

      {usingFallback ? (
        <p className="rounded-lg border border-success/20 bg-success/10 p-3 text-sm font-bold text-success">
          Admin dashboard ready.
        </p>
      ) : null}
      {status ? <p className="rounded-lg border border-info/20 bg-info/10 p-3 text-sm font-bold text-info">{status}</p> : null}

      <div role="tablist" aria-label={t("admin.title")} className="flex gap-2">
        {[
          { id: "manage", label: t("admin.manage_tab") },
          { id: "analytics", label: t("admin.analytics_tab") },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={view === tab.id}
            onClick={() => setView(tab.id)}
            className={`rounded-xl px-5 py-2.5 text-sm font-bold transition-colors ${
              view === tab.id ? "bg-secondary text-white" : "border border-border bg-surface text-text-secondary hover:border-primary hover:text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {view === "analytics" ? (
        <AdminAnalyticsPanel t={t} selectedUserId={selectedUserId} />
      ) : (
      <>
      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label={t("admin.users_loaded")} value={users.length} helper={t("admin.search_results")} tone="bg-surface" />
        <StatCard label={t("admin.forge_subjects")} value={forgeContent.length} helper={t("admin.across_all_users")} tone="bg-info/10" />
        <StatCard
          label={t("admin.top_score")}
          value={overview?.topUsers?.[0]?.totalScore?.toLocaleString() || "-"}
          helper={t("admin.leaderboard_leader")}
          tone="bg-warning/10"
        />
      </section>

      <section className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] [&>*]:min-w-0">
        <article className="card card-pad">
          <div className="section-head">
            <div className="flex items-center gap-3">
              <span className="icon-tile" style={{ width: "2.25rem", height: "2.25rem" }}><Users size={17} /></span>
              <div>
                <p className="eyebrow">{t("admin.user_management")}</p>
                <h2 className="mt-0.5 text-text-primary">{t("admin.search_users")}</h2>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={t("admin.search_placeholder")}
              aria-label={t("admin.search_placeholder")}
              className="field min-w-0 flex-1"
            />
            <button
              type="button"
              disabled={busy}
              onClick={runSearch}
              className="btn-secondary shrink-0"
            >
              <Search size={15} />
              {t("common.search")}
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
                    <span className="block font-black">{item.name || t("admin.unnamed")}</span>
                    <span className="block text-xs text-text-secondary">{item.email}</span>
                  </span>
                  <span className="text-right text-xs font-bold text-text-secondary">
                    {t("leaderboard.xp")} {item.xp || 0}
                    <br />
                    {t("dashboard.energy")} {item.energy || 0}
                  </span>
                </button>
              ))
            ) : (
              <EmptyState title={t("admin.no_users")} copy={t("admin.no_users_desc")} />
            )}
          </div>
        </article>

        <article className="card card-pad">
          <div className="section-head">
            <div className="flex items-center gap-3">
              <span className="icon-tile" style={{ width: "2.25rem", height: "2.25rem" }}><Zap size={17} /></span>
              <div>
                <p className="eyebrow">{t("admin.rewards_progress")}</p>
                <h2 className="mt-0.5 text-text-primary">{t("admin.adjust_xp")}</h2>
              </div>
            </div>
          </div>

          {selectedUser ? (
            <p className="mb-4 rounded-xl border border-border bg-background p-3 text-sm text-text-secondary">
              <strong className="text-text-primary">{selectedUser.name}</strong> · {t("leaderboard.xp")} {(selectedUser.xp || 0).toLocaleString()} · {t("dashboard.energy")} {selectedUser.energy || 0} · {t("admin.total")} {(selectedUser.totalScore || calculateTotalScore(selectedUser)).toLocaleString()}
            </p>
          ) : (
            <p className="mb-4 text-sm text-text-secondary">{t("admin.select_user")}</p>
          )}

          <div className="grid gap-3">
            <div className="rounded-xl border border-border bg-background/60 p-3">
              <p className="text-[13px] font-bold text-text-primary">{t("leaderboard.xp")}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  value={xpDelta}
                  onChange={(event) => setXpDelta(event.target.value)}
                  aria-label={t("leaderboard.xp")}
                  className="field !w-24"
                />
                <button type="button" disabled={busy} onClick={() => runXpAdjust(1)} className="btn-primary !min-h-[40px] !px-3.5 !py-2 text-[13px]">
                  {t("admin.add_xp")}
                </button>
                <button type="button" disabled={busy} onClick={() => runXpAdjust(-1)} className="btn-ghost !min-h-[40px] !px-3.5 !py-2 text-[13px]">
                  {t("admin.remove_xp")}
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background/60 p-3">
              <p className="text-[13px] font-bold text-text-primary">{t("dashboard.energy")}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  value={energyDelta}
                  onChange={(event) => setEnergyDelta(event.target.value)}
                  aria-label={t("dashboard.energy")}
                  className="field !w-24"
                />
                <button type="button" disabled={busy} onClick={() => runEnergyAdjust(1)} className="btn-primary !min-h-[40px] !px-3.5 !py-2 text-[13px]">
                  {t("admin.add_energy")}
                </button>
                <button type="button" disabled={busy} onClick={() => runEnergyAdjust(-1)} className="btn-ghost !min-h-[40px] !px-3.5 !py-2 text-[13px]">
                  {t("admin.remove_energy")}
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background/60 p-3">
              <p className="text-[13px] font-bold text-text-primary">{t("admin.total_score_override")}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  value={totalScoreInput}
                  onChange={(event) => setTotalScoreInput(event.target.value)}
                  aria-label={t("admin.total_score_override")}
                  className="field !w-28"
                />
                <button type="button" disabled={busy} onClick={runTotalScoreSet} className="btn-secondary !min-h-[40px] !px-3.5 !py-2 text-[13px]">
                  {t("admin.set_total_score")}
                </button>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] [&>*]:min-w-0">
        <article className="card card-pad">
          <div className="section-head">
            <div className="flex items-center gap-3">
              <span className="icon-tile" style={{ width: "2.25rem", height: "2.25rem" }}><Trophy size={17} /></span>
              <div>
                <p className="eyebrow">{t("leaderboard.title")}</p>
                <h2 className="mt-0.5 text-text-primary">{t("admin.reward_events")}</h2>
              </div>
            </div>
          </div>

          <div className="grid gap-2.5">
            <input
              type="number"
              value={rewardXp}
              onChange={(event) => setRewardXp(event.target.value)}
              className="field"
              placeholder={t("admin.xp_to_grant")}
              aria-label={t("admin.xp_to_grant")}
            />
            <input
              type="number"
              value={rewardEnergy}
              onChange={(event) => setRewardEnergy(event.target.value)}
              className="field"
              placeholder={t("admin.energy_to_grant")}
              aria-label={t("admin.energy_to_grant")}
            />
            <input
              value={rewardReason}
              onChange={(event) => setRewardReason(event.target.value)}
              className="field"
              placeholder={t("admin.reason")}
              aria-label={t("admin.reason")}
            />
            <button
              type="button"
              disabled={busy}
              onClick={runRewardEvent}
              className="btn-primary"
            >
              <Award size={16} />
              {t("admin.grant_reward_event")}
            </button>
          </div>

          {overview?.topUsers?.length ? (
            <div className="mt-5">
              <p className="text-sm font-bold uppercase tracking-widest text-text-secondary">{t("admin.top_leaderboard")}</p>
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

        <article className="card card-pad">
          <div className="section-head">
            <div className="flex items-center gap-3">
              <span className="icon-tile" style={{ width: "2.25rem", height: "2.25rem" }}><BookOpen size={17} /></span>
              <div>
                <p className="eyebrow">{t("admin.content")}</p>
                <h2 className="mt-0.5 text-text-primary">{t("admin.forge_moderation")}</h2>
              </div>
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
                    {entry.subject.units?.length || 0} {t("admin.units")} &bull;{" "}
                    {entry.subject.units?.reduce((acc, unit) => acc + (unit.subUnits?.length || 0), 0) || 0} {t("admin.sub_units")}
                  </p>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => removeForgeSubject(entry.userId, entry.subject.id)}
                    className="mt-2 rounded-lg border border-error/20 px-3 py-1 text-xs font-bold text-error"
                  >
                    {t("admin.remove_subject")}
                  </button>
                </div>
              ))
            ) : (
              <EmptyState title={t("admin.no_forge_content")} copy={t("admin.no_forge_content_desc")} />
            )}
          </div>
        </article>
      </section>
      </>
      )}
    </div>
  );
}
