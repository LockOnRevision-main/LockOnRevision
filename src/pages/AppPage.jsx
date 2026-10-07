import { Award, BookOpen, CalendarDays, CheckCircle2, Clock, ListChecks, Target, Trophy, Zap, AlertTriangle, GraduationCap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { EmptyState } from "../components/EmptyState.jsx";
import { StatCard } from "../components/StatCard.jsx";
import { LeaderboardPreview } from "../components/LeaderboardPreview.jsx";
import { DailyChallengeCard } from "../components/DailyChallengeCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { subscribeSubjects, subscribeUserCollection } from "../services/learningService.js";
import { getTopLeaderboardUsers } from "../services/leaderboardService.js";
import { getTodaySessions, getUpcomingLessons, getWeeklyCompletion, getRemainingWorkload, subscribeTimetables, getNextExam, getUpcomingDeadlines, getSyllabusProgress, getLastUpdatedTimestamp } from "../services/timetableService.js";

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
  const { t } = useTranslation();
  const [subjects, setSubjects] = useState([]);
  const [units, setUnits] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [timetables, setTimetables] = useState([]);
  const [leaderboardUsers, setLeaderboardUsers] = useState([]);
  const [leaderboardKey, setLeaderboardKey] = useState(0);
  const score = scoreBreakdown(profile);

  const activeTimetable = timetables[0];

  const todaySessions = useMemo(() => activeTimetable ? getTodaySessions(activeTimetable) : [], [activeTimetable]);
  const upcomingLessons = useMemo(() => activeTimetable ? getUpcomingLessons(activeTimetable, 4) : [], [activeTimetable]);
  const weeklyCompletion = useMemo(() => activeTimetable ? getWeeklyCompletion(activeTimetable) : { completed: 0, total: 0, percent: 0 }, [activeTimetable]);
  const remainingWorkload = useMemo(() => activeTimetable ? getRemainingWorkload(activeTimetable) : { totalMinutes: 0, bySubject: [] }, [activeTimetable]);
  const nextExam = useMemo(() => activeTimetable ? getNextExam(activeTimetable) : null, [activeTimetable]);
  const upcomingDeadlines = useMemo(() => activeTimetable ? getUpcomingDeadlines(activeTimetable, 4) : [], [activeTimetable]);
  const syllabusProgress = useMemo(() => activeTimetable ? getSyllabusProgress(activeTimetable) : null, [activeTimetable]);
  const lastUpdated = useMemo(() => activeTimetable ? getLastUpdatedTimestamp(activeTimetable) : null, [activeTimetable]);

  useEffect(() => {
    if (!user?.uid) return;

    const subSubjects = subscribeSubjects(user.uid, setSubjects);
    const subUnits = subscribeUserCollection(user.uid, "units", setUnits);
    const subLessons = subscribeUserCollection(user.uid, "lessons", setLessons);
    const subTts = subscribeTimetables(user.uid, setTimetables);

    return () => {
      subSubjects();
      subUnits();
      subLessons();
      subTts();
    };
  }, [user?.uid]);

  useEffect(() => {
    getTopLeaderboardUsers().then((users) => setLeaderboardUsers(users)).catch(() => {});
  }, [user?.uid, profile?.totalScore, leaderboardKey]);

  useEffect(() => {
    const interval = window.setInterval(() => setLeaderboardKey((k) => k + 1), 30000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="grid min-w-0 grid-cols-1 gap-8 [&>*]:min-w-0">
<section className="card overflow-hidden">
        <div className="p-6 sm:p-8" style={{ background: "var(--color-secondary)" }}>
          <p className="eyebrow !text-white/60">{t("dashboard.title")}</p>
          <div className="mt-3 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div className="flex min-w-0 flex-col gap-1.5">
              <h1 className="text-white">{t("dashboard.welcome", { name: profile?.name || "Learner" })}</h1>
              <p className="max-w-2xl text-[15px] text-white/75">{t("dashboard.welcome_subtitle")}</p>
            </div>
            <Link
              to="/leaderboard"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-secondary"
            >
              <Trophy size={16} />
              {t("nav.leaderboard")}
            </Link>
          </div>
        </div>
      </section>

      {!isFirebaseConfigured ? (
        <p className="rounded-xl border border-border bg-card p-4 text-sm font-bold text-text-primary shadow-sm">
          {t("dashboard.config_missing")}
        </p>
      ) : null}

      <section aria-label={t("dashboard.learning_progress")}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 [&>*]:min-w-0">
          <StatCard label={t("dashboard.total_score")} value={score.totalScore.toLocaleString()} helper={t("dashboard.total_score_formula")} tone="bg-surface" icon={<Trophy size={16} />} />
          <StatCard label={t("dashboard.xp")} value={score.xp.toLocaleString()} helper={t("dashboard.learning_progress")} tone="bg-surface" icon={<Zap size={16} />} />
          <StatCard label={t("dashboard.energy")} value={String(score.energy)} helper={t("dashboard.energy_helper")} tone="bg-surface" icon={<Award size={16} />} />
          <StatCard
            label={t("dashboard.streak")}
            value={`${profile?.currentStreak ?? profile?.streak ?? 0} ${t("common.days")}`}
            helper={t("dashboard.lessons_completed_count", { count: profile?.completedLessons || 0 })}
            tone="bg-surface"
            icon={<CalendarDays size={16} />}
          />
        </div>
      </section>

      {/* Daily AI Challenge */}
      <DailyChallengeCard />

      {/* Last updated timestamp */}
      {activeTimetable && lastUpdated && (
        <p className="text-right text-xs text-text-muted">Updated {new Date(lastUpdated).toLocaleString()} · <Link to="/timetable" className="font-semibold text-primary hover:underline">Manage timetable</Link></p>
      )}

      {/* Exam countdown + Syllabus progress + Deadlines row */}
      {activeTimetable && (nextExam || syllabusProgress || upcomingDeadlines.length > 0) && (
        <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {/* Next Exam Countdown */}
          <article className="rounded-3xl border border-border bg-surface p-6 shadow-sm flex flex-col">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-status-error/10 p-2 text-status-error shrink-0">
                <GraduationCap size={20} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">Next Exam</p>
                <h3 className="text-lg font-black tracking-tight text-text-primary">{nextExam ? nextExam.subject : "No exams scheduled"}</h3>
              </div>
            </div>
            {nextExam ? (
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className={`text-4xl font-black tracking-tighter ${nextExam.diffDays <= 3 ? "text-status-error" : nextExam.diffDays <= 7 ? "text-warning" : "text-text-primary"}`}>{nextExam.diffDays}</span>
                  <span className="text-sm font-bold text-text-muted">{nextExam.diffDays === 0 ? "Today!" : nextExam.diffDays === 1 ? "day left" : "days left"}</span>
                </div>
                <p className="mt-1 text-sm text-text-secondary">{new Date(nextExam.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })} • {nextExam.type}</p>
                {nextExam.diffDays <= 7 && (
                  <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-status-error/10 border border-status-error/20 px-2 py-1 text-xs font-bold text-status-error"><AlertTriangle size={12} /> Upcoming soon</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-text-muted flex-1">Add exam dates in Timetable to see countdown.</p>
            )}
            <Link to="/timetable" className="mt-4 text-xs font-bold text-primary underline underline-offset-2">View all deadlines →</Link>
          </article>

          {/* Syllabus Progress */}
          <article className="rounded-3xl border border-border bg-surface p-6 shadow-sm flex flex-col">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-2 text-primary shrink-0">
                <BookOpen size={20} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">Syllabus Progress</p>
                <h3 className="text-lg font-black tracking-tight text-text-primary">{syllabusProgress ? `${syllabusProgress.percent}%` : "—"}</h3>
              </div>
            </div>
            {syllabusProgress ? (
              <div className="flex-1">
                <div className="h-2 w-full overflow-hidden rounded-full bg-background border border-border">
                  <div className="h-full bg-primary transition-all duration-500" style={{ width: `${syllabusProgress.percent}%` }} />
                </div>
                <p className="mt-1 text-xs text-text-secondary">{syllabusProgress.completed}/{syllabusProgress.total} sessions completed</p>
                {syllabusProgress.bySubject.slice(0, 3).map((s) => (
                  <div key={s.subject} className="mt-2 flex justify-between text-xs">
                    <span className="truncate text-text-secondary">{s.subject}</span>
                    <span className="font-bold text-text-primary">{s.percent}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted flex-1">Upload syllabus to track progress.</p>
            )}
            <Link to="/timetable" className="mt-4 text-xs font-bold text-primary underline underline-offset-2">View timetable →</Link>
          </article>

          {/* Upcoming Deadlines */}
          <article className="rounded-3xl border border-border bg-surface p-6 shadow-sm flex flex-col">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-warning/10 p-2 text-warning shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">Upcoming Deadlines</p>
                <h3 className="text-lg font-black tracking-tight text-text-primary">Deadlines</h3>
              </div>
            </div>
            {upcomingDeadlines.length > 0 ? (
              <div className="space-y-2 flex-1">
                {upcomingDeadlines.map((d, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-text-primary">{d.subject}</p>
                      <p className="text-xs text-text-muted">{d.type} • {new Date(d.date + "T00:00:00").toLocaleDateString()}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-black ${d.diffDays <= 3 ? "bg-status-error/15 text-status-error" : d.diffDays <= 7 ? "bg-warning/15 text-warning" : "bg-surface border border-border text-text-muted"}`}>{d.diffDays === 0 ? "Today" : `${d.diffDays}d`}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted flex-1">No upcoming deadlines.</p>
            )}
            <Link to="/timetable" className="mt-4 text-xs font-bold text-primary underline underline-offset-2">View timetable →</Link>
          </article>
        </section>
      )}

      {/* Timetable dashboard row */}
      {activeTimetable ? (
        <section aria-label={t("timetable.todays_study")}>
          <div className="section-head">
            <div>
              <p className="eyebrow">{t("timetable.weekly")}</p>
              <h2 className="mt-1 text-text-primary">{t("timetable.todays_study")}</h2>
            </div>
            <Link to="/timetable" className="btn-ghost !min-h-[40px] !py-2 text-[13px]">{t("timetable.view_full")}</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {/* Today's Study */}
          <article className="rounded-3xl border border-border bg-surface p-6 shadow-sm transition-all hover:shadow-md h-full flex flex-col">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-2 text-primary shrink-0">
                <Clock size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">{t("timetable.todays_study")}</p>
                <h3 className="text-lg font-black tracking-tight text-text-primary">{t("timetable.sessions")}</h3>
              </div>
            </div>
            {todaySessions.length > 0 ? (
              <div className="space-y-2 flex-1">
                {todaySessions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-text-primary">{s.subject}</p>
                      <p className="text-xs text-text-muted">{s.topic !== s.subject ? s.topic : ""} &middot; {s.duration}m</p>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-text-muted whitespace-nowrap">{s.timeSlot}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm italic text-text-muted flex-1 flex items-center justify-center">{t("timetable.all_done")}</p>
            )}
            <div className="mt-4 pt-4 border-t border-border">
              <Link to="/timetable" className="text-xs font-bold text-primary underline underline-offset-2 hover:text-secondary inline-flex items-center gap-1">
                {t("timetable.view_full")}
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </article>

          {/* Upcoming Lessons */}
          <article className="rounded-3xl border border-border bg-surface p-6 shadow-sm transition-all hover:shadow-md h-full flex flex-col">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-2 text-primary shrink-0">
                <ListChecks size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">{t("timetable.upcoming")}</p>
                <h3 className="text-lg font-bold tracking-tight text-text-primary">{t("timetable.title")}</h3>
              </div>
            </div>
            {upcomingLessons.length > 0 ? (
              <div className="space-y-2 flex-1">
                {upcomingLessons.map((s, i) => (
                  <div key={s.id || i} className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-text-primary">{s.subject}</p>
                      <p className="text-xs text-text-muted">{s.date} &middot; {s.timeSlot}</p>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-text-muted whitespace-nowrap">{s.duration}m</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm italic text-text-muted flex-1 flex items-center justify-center">{t("timetable.no_upcoming")}</p>
            )}
            <div className="mt-4 pt-4 border-t border-border">
              <Link to="/timetable" className="text-xs font-bold text-primary underline underline-offset-2 hover:text-secondary inline-flex items-center gap-1">
                {t("timetable.view_full")}
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </article>

          {/* Weekly Completion */}
          <article className="rounded-3xl border border-border bg-surface p-6 shadow-sm transition-all hover:shadow-md h-full flex flex-col">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-2 text-primary shrink-0">
                <CalendarDays size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">{t("timetable.weekly")}</p>
                <h3 className="text-lg font-black tracking-tight text-text-primary">{t("timetable.completion")}</h3>
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black tracking-tighter text-text-primary">{weeklyCompletion.percent}%</span>
              <span className="text-sm text-text-muted">{t("timetable.percent_done")}</span>
            </div>
            <p className="mt-1 text-sm text-text-secondary">
              {weeklyCompletion.completed}/{weeklyCompletion.total} {t("timetable.sessions_word")}
            </p>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-background border border-border flex-1">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${weeklyCompletion.percent}%` }}
              />
            </div>
          </article>

          {/* Remaining Workload */}
          <article className="rounded-3xl border border-border bg-surface p-6 shadow-sm transition-all hover:shadow-md h-full flex flex-col">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-2 text-primary shrink-0">
                <BookOpen size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">{t("timetable.remaining")}</p>
                <h3 className="text-lg font-black tracking-tight text-text-primary">{t("timetable.workload")}</h3>
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black tracking-tighter text-text-primary">
                {Math.round(remainingWorkload.totalMinutes / 60)}h
              </span>
              <span className="text-sm text-text-muted">{t("timetable.minutes_left", { minutes: remainingWorkload.totalMinutes % 60 })}</span>
            </div>
            {remainingWorkload.bySubject.length > 0 ? (
              <div className="mt-3 space-y-1 flex-1">
                {remainingWorkload.bySubject.slice(0, 3).map((s) => (
                  <div key={s.subject} className="flex justify-between text-xs text-text-secondary">
                    <span className="truncate">{s.subject}</span>
                    <span className="font-medium whitespace-nowrap">{Math.round(s.minutes / 60)}h {s.minutes % 60}m</span>
                  </div>
                ))}
              </div>
            ) : null}
          </article>
          </div>
        </section>
      ) : (
        <Link
          to="/timetable"
          className="card card-hover flex flex-col gap-4 p-5 text-left sm:flex-row sm:items-center sm:justify-between sm:p-6"
        >
          <div className="flex items-center gap-4">
            <span className="icon-tile"><CalendarDays size={20} /></span>
            <div>
              <p className="font-bold text-text-primary">{t("timetable.create_timetable")}</p>
              <p className="mt-0.5 text-sm text-text-secondary">{t("timetable.create_subtitle")}</p>
            </div>
          </div>
          <span className="btn-primary !w-full sm:!w-auto">
            {t("common.create")}
          </span>
        </Link>
      )}

      <section className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] [&>*]:min-w-0">
        <article className="card card-pad flex h-full flex-col">
            <div className="section-head">
              <div className="flex items-center gap-3">
                <span className="icon-tile"><Trophy size={19} /></span>
                <div className="min-w-0">
                  <p className="eyebrow">{t("nav.leaderboard")}</p>
                  <h2 className="mt-0.5 text-text-primary">{t("leaderboard.top_learners")}</h2>
                </div>
              </div>
              <Link to="/leaderboard" className="btn-ghost !min-h-[40px] !py-2 text-[13px]">{t("leaderboard.view_full")}</Link>
            </div>

            {leaderboardUsers.length === 0 ? (
              <div className="grid flex-1 gap-3" aria-label={t("common.loading")} role="status">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="skeleton h-6 w-8" />
                    <div className="skeleton h-9 w-9 !rounded-xl" />
                    <div className="skeleton h-4 flex-1" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1">
                <LeaderboardPreview
                  users={leaderboardUsers}
                  currentUserId={user?.uid || profile?.id}
                />
              </div>
            )}
          </article>

        <article className="card card-pad flex h-full flex-col">
           <div className="section-head">
             <div className="flex items-center gap-3">
               <span className="icon-tile"><Award size={19} /></span>
               <div className="min-w-0">
                 <p className="eyebrow">{t("dashboard.my_subjects")}</p>
                 <h2 className="mt-0.5 text-text-primary">{t("dashboard.continue_learning")}</h2>
               </div>
             </div>
           </div>

           {subjects.length === 0 ? (
             <div className="flex-1">
               <EmptyState
                 title={t("forge.no_subjects")}
                 copy={t("dashboard.no_subjects_desc")}
                 action={<Link to="/forge" className="btn-primary">{t("dashboard.open_forge")}</Link>}
               />
             </div>
           ) : (
              <div className="grid min-w-0 flex-1 gap-5 [&>*]:min-w-0">
               {subjects.map((subject) => {
                 const subjectLessons = lessons.filter((l) => l.subjectId === subject.id);
                 const completedLessons = subjectLessons.filter((l) => l.completed);
                 const progress = subjectLessons.length
                   ? Math.round((completedLessons.length / subjectLessons.length) * 100)
                   : 0;
                 const xp = completedLessons.reduce((sum, l) => sum + (l.xpEarned || 0), 0);
                 const firstIncomplete = subjectLessons.find((l) => !l.completed);
                 const currentUnit = firstIncomplete
                   ? units.find((u) => u.id === firstIncomplete.unitId)?.title || t("common.unit_1")
                   : t("lesson.completed");
   
                 return (
                   <Link
                     key={subject.id}
                     to="/forge"
                     className="group flex items-start justify-between gap-4 rounded-2xl border border-border p-5 text-left transition-all hover:border-primary hover:bg-background shadow-sm h-full"
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
                      <span className="mt-1 shrink-0 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white">
                        {t("lesson.continue")}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
             <p className="mt-5 flex items-center gap-2 border-t border-border pt-4 text-xs text-text-muted">
               <Zap size={14} className="shrink-0 text-warning" />
               {t("dashboard.total_score_formula")}
             </p>
          </article>

      </section>
    </div>
  );
}
