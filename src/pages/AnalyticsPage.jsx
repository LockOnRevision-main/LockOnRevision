import { Award, BarChart3, CalendarDays, CheckCircle2, Flame, Target, Trophy, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { EmptyState } from "../components/EmptyState.jsx";
import { StatCard } from "../components/StatCard.jsx";
import { ActivityHeatmap } from "../components/Profile/ActivityHeatmap.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { subscribeForgeLessons, subscribeForgeSubjects } from "../services/forgeService.js";
import { subscribeTimetables } from "../services/timetableService.js";
import { getTopLeaderboardUsers } from "../services/leaderboardService.js";
import {
  computeAdherence,
  computeConsistency,
  computeFocusNext,
  computePerformance,
  computeSubjectBreakdown,
  computeWeeklyTrend,
  fetchChallengeHistory,
  fetchQuestionSnapshot,
  toDate,
} from "../services/analyticsService.js";

function WeeklyBars({ data }) {
  const max = Math.max(1, ...data.map((w) => w.lessons));
  const W = 560;
  const H = 180;
  const PAD = 28;
  const bw = (W - PAD * 2) / data.length;
  return (
    <div role="img" aria-label="Lessons completed per week">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="presentation">
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={f}
            x1={PAD}
            x2={W - PAD}
            y1={H - PAD - (H - PAD * 2) * f}
            y2={H - PAD - (H - PAD * 2) * f}
            stroke="var(--color-border)"
            strokeWidth="1"
          />
        ))}
        {data.map((w, i) => {
          const h = Math.max(4, ((H - PAD * 2) * w.lessons) / max);
          const x = PAD + i * bw + bw * 0.22;
          return (
            <g key={w.label}>
              <title>{`${w.label}: ${w.lessons} lessons, ${w.xp} XP`}</title>
              <rect
                x={x}
                y={H - PAD - h}
                width={bw * 0.56}
                height={h}
                rx="5"
                fill={i === data.length - 1 ? "var(--color-primary)" : "color-mix(in srgb, var(--color-primary) 45%, transparent)"}
              />
              <text x={x + (bw * 0.56) / 2} y={H - 10} textAnchor="middle" fontSize="10" fill="var(--color-text-muted)">
                {w.label}
              </text>
            </g>
          );
        })}
      </svg>
      <ul className="sr-only">
        {data.map((w) => (
          <li key={w.label}>{`${w.label}: ${w.lessons} lessons, ${w.xp} XP`}</li>
        ))}
      </ul>
    </div>
  );
}

function SectionHead({ eyebrow, title, action }) {
  return (
    <div className="section-head">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="mt-1 text-text-primary">{title}</h2>
      </div>
      {action || null}
    </div>
  );
}

export function AnalyticsPage() {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [timetables, setTimetables] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [history, setHistory] = useState([]);
  const [rank, setRank] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!user?.uid) return;
    setLoadError("");
    const onErr = () => setLoadError(t("errors.generic"));
    const unsubs = [
      subscribeForgeSubjects(user.uid, (items) => { setSubjects(items); setLoaded(true); }, onErr),
      subscribeForgeLessons(user.uid, setLessons, onErr),
      subscribeTimetables(user.uid, setTimetables),
    ];
    let cancelled = false;
    fetchQuestionSnapshot(user.uid).then((q) => { if (!cancelled) setQuestions(q); }).catch(() => {});
    fetchChallengeHistory(user.uid).then((h) => { if (!cancelled) setHistory(h); }).catch(() => {});
    getTopLeaderboardUsers()
      .then((users) => {
        if (cancelled) return;
        const idx = users.findIndex((u) => u.id === (user.uid || profile?.id));
        setRank(idx >= 0 ? (users[idx]._rank ?? idx + 1) : null);
      })
      .catch(() => {});
    return () => { cancelled = true; unsubs.forEach((u) => u?.()); };
  }, [user?.uid, t]); // eslint-disable-line react-hooks/exhaustive-deps

  const breakdown = useMemo(() => computeSubjectBreakdown(subjects, lessons, questions), [subjects, lessons, questions]);
  const trend = useMemo(() => computeWeeklyTrend(lessons, 8), [lessons]);
  const performance = useMemo(() => computePerformance(lessons, questions), [lessons, questions]);
  const consistency = useMemo(() => computeConsistency(profile?.activity || {}), [profile?.activity]);
  const adherence = useMemo(() => computeAdherence(timetables), [timetables]);
  const focus = useMemo(() => computeFocusNext(breakdown, lessons), [breakdown, lessons]);

  const totalLessons = lessons.length;
  const doneLessons = lessons.filter((l) => l.completed).length;
  const overallPercent = totalLessons ? Math.round((doneLessons / totalLessons) * 100) : 0;
  const streak = profile?.currentStreak ?? profile?.streak ?? 0;
  const strongest = breakdown.filter((s) => s.total > 0).sort((a, b) => b.percent - a.percent)[0] || null;

  if (!loaded && !loadError) {
    return (
      <div className="grid gap-4" role="status" aria-label={t("common.loading")}>
        <div className="skeleton h-24 w-full !rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (<div key={i} className="skeleton h-28 w-full !rounded-2xl" />))}
        </div>
        <div className="skeleton h-48 w-full !rounded-2xl" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="grid gap-4">
        <p className="alert alert-error" role="alert">{loadError}</p>
      </div>
    );
  }

  if (!subjects.length && !lessons.length) {
    return (
      <div className="grid gap-5">
        <div>
          <p className="eyebrow">{t("nav.analytics")}</p>
          <h1 className="mt-1 text-text-primary">{t("analytics.title")}</h1>
          <p className="mt-1.5 max-w-2xl text-[15px] text-text-secondary">{t("analytics.subtitle")}</p>
        </div>
        <EmptyState
          title={t("analytics.empty_title")}
          copy={t("analytics.empty_desc")}
          action={<Link to="/forge" className="btn-primary">{t("analytics.open_forge")}</Link>}
        />
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <div>
        <p className="eyebrow">{t("nav.analytics")}</p>
        <h1 className="mt-1 text-text-primary">{t("analytics.title")}</h1>
        <p className="mt-1.5 max-w-2xl text-[15px] text-text-secondary">{t("analytics.subtitle")}</p>
      </div>

      {/* What to focus on next */}
      <section className="card card-pad" aria-label={t("analytics.focus_next")}>
        <div className="flex items-center gap-3">
          <span className="icon-tile"><Target size={19} /></span>
          <h2 className="text-text-primary">{t("analytics.focus_next")}</h2>
        </div>
        {focus.weakest ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted">{t("analytics.weakest_subject")}</p>
              <p className="mt-1 font-bold text-text-primary">{focus.weakest.title}</p>
              <div className="progress-track mt-3">
                <div className="progress-fill" style={{ width: `${focus.weakest.percent}%` }} />
              </div>
              <p className="mt-1.5 text-xs tabular-nums text-text-secondary">
                {focus.weakest.completed}/{focus.weakest.total} {t("analytics.lessons_label")} · {focus.weakest.percent}%
              </p>
              {focus.weakest.weakTopics.length > 0 && (
                <div className="mt-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted">{t("analytics.weak_topics")}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {focus.weakest.weakTopics.map((wt) => (
                      <span key={wt.topic} className="badge !text-[11px]">{wt.topic}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col justify-between gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted">{t("analytics.suggested_lesson")}</p>
                <p className="mt-1 font-bold text-text-primary">{focus.nextLesson ? focus.nextLesson.title : focus.weakest.title}</p>
                {focus.nextLesson?.concept && (
                  <p className="mt-1 line-clamp-2 text-[13px] text-text-secondary">{focus.nextLesson.concept}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {focus.nextLesson ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/forge/lesson/${focus.nextLesson.subjectId}/${focus.nextLesson.id}`)}
                    className="btn-primary !min-h-[40px] !px-4 !py-2 text-[13px]"
                  >
                    {t("analytics.start_lesson")}
                  </button>
                ) : null}
                <Link to="/forge" className="btn-ghost !min-h-[40px] !px-4 !py-2 text-[13px]">{t("analytics.open_forge")}</Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-success/25 bg-success/5 p-4">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-success" />
            <div>
              <p className="font-bold text-text-primary">{t("analytics.focus_all_done_title")}</p>
              <p className="mt-0.5 text-sm text-text-secondary">{t("analytics.focus_all_done_desc")}</p>
            </div>
          </div>
        )}
      </section>

      {/* Key stats */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label={t("analytics.completion_rate")}>
        <StatCard label={t("analytics.completion_rate")} value={`${overallPercent}%`} helper={`${doneLessons}/${totalLessons} ${t("analytics.lessons_label")}`} icon={<BarChart3 size={16} />} />
        <StatCard label={t("analytics.day_streak")} value={`${streak}`} helper={`${consistency.activeDays28} ${t("analytics.active_days")}`} icon={<Flame size={16} />} />
        <StatCard label={t("analytics.study_hours")} value={`${consistency.hours28}`} helper={`${t("analytics.consistency_title")} · ${consistency.avgHoursActiveDay}h/day`} icon={<CalendarDays size={16} />} />
        <StatCard
          label={t("analytics.perfect_rate")}
          value={performance.perfectRate === null ? "—" : `${performance.perfectRate}%`}
          helper={performance.avgMastery === null ? t("analytics.lessons_completed") : `${t("analytics.avg_mastery")}: ${performance.avgMastery}%`}
          icon={<Award size={16} />}
        />
      </section>

      {/* Weekly trend */}
      <section className="card card-pad" aria-label={t("analytics.weekly_trend")}>
        <SectionHead eyebrow={t("nav.analytics")} title={t("analytics.weekly_trend")} />
        <p className="mb-4 text-[13px] text-text-secondary">{t("analytics.weekly_trend_desc")}</p>
        <WeeklyBars data={trend} />
      </section>

      {/* Subject breakdown */}
      <section className="card card-pad" aria-label={t("analytics.by_subject")}>
        <SectionHead eyebrow={t("nav.analytics")} title={t("analytics.by_subject")} />
        <p className="mb-4 text-[13px] text-text-secondary">{t("analytics.by_subject_desc")}</p>
        <div className="grid gap-3">
          {breakdown.map((s) => (
            <div key={s.id} className="rounded-xl border border-border bg-background p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex min-w-0 items-center gap-2 font-bold text-text-primary">
                  <span className="truncate">{s.title}</span>
                  {strongest && s.id === strongest.id && s.total > 0 ? (
                    <span className="badge badge-primary !text-[10px]">{t("analytics.strongest")}</span>
                  ) : null}
                  {focus.weakest && s.id === focus.weakest.id ? (
                    <span className="badge !border-warning/30 !bg-warning/10 !text-warning !text-[10px]">{t("analytics.needs_attention")}</span>
                  ) : null}
                </p>
                <p className="text-sm font-bold tabular-nums text-text-primary">{s.percent}%</p>
              </div>
              <div className="progress-track mt-2.5">
                <div className="progress-fill" style={{ width: `${s.percent}%` }} />
              </div>
              <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs tabular-nums text-text-secondary">
                <span>{s.completed}/{s.total} {t("analytics.lessons_label")}</span>
                <span className="inline-flex items-center gap-1"><Zap size={11} className="text-warning" />{s.xp.toLocaleString()} XP</span>
                {s.perfect > 0 ? <span className="inline-flex items-center gap-1"><CheckCircle2 size={11} className="text-success" />{s.perfect}</span> : null}
                {s.avgMastery !== null ? <span>{t("analytics.avg_mastery")}: {s.avgMastery}%</span> : null}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Consistency */}
      <section aria-label={t("analytics.consistency_title")}>
        <SectionHead eyebrow={t("nav.analytics")} title={t("analytics.consistency_title")} />
        <p className="mb-4 text-[13px] text-text-secondary">{t("analytics.consistency_desc")}</p>
        <ActivityHeatmap activity={profile?.activity || {}} />
      </section>

      {/* Plan adherence + challenge record + rank */}
      <section className="grid items-start gap-4 lg:grid-cols-2">
        <div className="card card-pad">
          <SectionHead eyebrow={t("nav.analytics")} title={t("analytics.timetable_adherence")} />
          <p className="mb-4 text-[13px] text-text-secondary">{t("analytics.adherence_desc")}</p>
          {adherence.total > 0 && adherence.percent !== null ? (
            <div>
              <p className="text-2xl font-extrabold tabular-nums text-text-primary">{adherence.percent}%</p>
              <p className="mt-0.5 text-[13px] text-text-secondary">
                {adherence.completed} {t("analytics.sessions_done")} · {adherence.skipped} skipped
              </p>
              <div className="progress-track mt-3">
                <div className="progress-fill" style={{ width: `${adherence.percent}%` }} />
              </div>
              {adherence.bySubject.length > 0 && (
                <div className="mt-4 grid gap-2">
                  {adherence.bySubject.map((r) => (
                    <div key={r.subject} className="flex items-center gap-3 text-[13px]">
                      <span className="w-28 truncate font-semibold text-text-secondary">{r.subject}</span>
                      <div className="progress-track flex-1">
                        <div className="progress-fill" style={{ width: `${r.percent}%` }} />
                      </div>
                      <span className="w-10 text-right font-bold tabular-nums text-text-primary">{r.percent}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <EmptyState title={t("timetable.no_upcoming")} copy={t("analytics.adherence_desc")} />
          )}
        </div>

        <div className="grid gap-4">
          <div className="card card-pad">
            <SectionHead
              eyebrow={t("nav.analytics")}
              title={t("analytics.challenge_record")}
              action={rank !== null ? (
                <span className="badge badge-primary">#{rank}</span>
              ) : null}
            />
            {history.length > 0 ? (
              <div>
                <p className="mb-3 text-[13px] text-text-secondary">
                  {history.length} {t("analytics.challenges_done")} · {history.filter((h) => h.perfect).length} {t("analytics.perfect_count")}
                </p>
                <ul className="grid gap-2">
                  {history.slice(0, 5).map((h) => {
                    const d = toDate(h.completedAt);
                    return (
                      <li key={h.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2 text-[13px]">
                        <span className="flex min-w-0 items-center gap-2">
                          {h.perfect ? <Trophy size={13} className="shrink-0 text-warning" /> : <CheckCircle2 size={13} className="shrink-0 text-success" />}
                          <span className="truncate font-semibold text-text-primary">{h.title || h.date || "Challenge"}</span>
                        </span>
                        <span className="shrink-0 tabular-nums text-text-secondary">
                          {typeof h.score === "number" ? `${h.score}% · ` : ""}{d ? d.toLocaleDateString() : ""}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-text-secondary">{t("analytics.no_challenges")}</p>
            )}
            <Link to="/leaderboard" className="btn-ghost mt-4 !min-h-[40px] w-full !py-2 text-[13px]">
              <Trophy size={15} /> {t("analytics.view_leaderboard")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
