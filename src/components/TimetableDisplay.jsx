import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_ABBR = { Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu", Friday: "Fri", Saturday: "Sat", Sunday: "Sun" };
const SUBJECT_COLORS = [
  "border-l-chart-blue bg-chart-blue/5",
  "border-l-chart-indigo bg-chart-indigo/5",
  "border-l-chart-violet bg-chart-violet/5",
  "border-l-chart-pink bg-chart-pink/5",
  "border-l-chart-orange bg-chart-orange/5",
  "border-l-chart-green bg-chart-green/5",
];

const TYPE_LABEL_KEYS = {
  revision: "revision",
  practice: "practice",
  review: "review",
};

export function TimetableDisplay({ timetable, onRegenerate }) {
  const { t } = useTranslation();
  const [currentWeek, setCurrentWeek] = useState(0);
  const weeks = timetable?.weeks || [];
  const week = weeks[currentWeek];
  const todayKey = (() => {
    try {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    } catch { return ""; }
  })();
  if (!week) return null;

  const totalWeeks = weeks.length;
  const subjectColorMap = new Map();
  let colorIdx = 0;
  const getSubjectColor = (subject) => {
    if (!subjectColorMap.has(subject)) {
      subjectColorMap.set(subject, SUBJECT_COLORS[colorIdx % SUBJECT_COLORS.length]);
      colorIdx++;
    }
    return subjectColorMap.get(subject);
  };

  const weekStart = new Date(week.startDate + "T00:00:00");
  const dateStr = (offset) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + offset);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  const totalMinutes = DAYS.reduce((sum, day) => {
    const slots = week.days?.[day] || [];
    return sum + slots.reduce((s, slot) => s + (slot.duration || 0), 0);
  }, 0);

  const subjectMinutes = {};
  DAYS.forEach((day) => {
    (week.days?.[day] || []).forEach((slot) => {
      subjectMinutes[slot.subject] = (subjectMinutes[slot.subject] || 0) + (slot.duration || 0);
    });
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="eyebrow">{t('timetable.weekly')}</p>
          <h2 className="mt-1 text-text-primary">
            {t('timetable_display.week_of', { current: week.weekNumber, total: totalWeeks })}
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            {week.startDate} &middot; {t('timetable_display.scheduled', { hours: Math.round(totalMinutes / 60), minutes: totalMinutes % 60 })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentWeek((p) => Math.max(0, p - 1))}
            disabled={currentWeek === 0}
            className="btn-ghost !min-h-[40px] !px-3"
            aria-label={t('timetable_display.previous_week')}
          >
            <ChevronLeft size={17} />
          </button>
          <span className="min-w-[4.5rem] text-center text-sm font-bold tabular-nums text-text-primary">
            {currentWeek + 1} / {totalWeeks}
          </span>
          <button
            type="button"
            onClick={() => setCurrentWeek((p) => Math.min(totalWeeks - 1, p + 1))}
            disabled={currentWeek >= totalWeeks - 1}
            className="btn-ghost !min-h-[40px] !px-3"
            aria-label={t('timetable_display.next_week')}
          >
            <ChevronRight size={17} />
          </button>
          {onRegenerate ? (
            <button type="button" onClick={onRegenerate} className="btn-primary !min-h-[40px] !py-2 text-[13px]">
              {t('timetable_display.regenerate')}
            </button>
          ) : null}
        </div>
      </div>

      {/* Subject time breakdown */}
      {Object.keys(subjectMinutes).length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {Object.entries(subjectMinutes).map(([subject, mins]) => (
            <span
              key={subject}
              className="rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-bold text-text-secondary shadow-sm"
            >
              {subject}: {Math.round(mins / 60)}{t('timetable_display.hours_suffix')} {mins % 60}{t('timetable_display.minutes_suffix')}
            </span>
          ))}
        </div>
      ) : null}

      {/* Week grid – vertical on <md, fluid on larger */}
      <div className="timetable-week-grid grid gap-3 grid-cols-1 xs:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 3xl:grid-cols-7">
        {DAYS.map((day, dayIdx) => {
          const slots = week.days?.[day] || [];
          const dayDate = new Date(weekStart);
          dayDate.setDate(dayDate.getDate() + dayIdx);
          const dayKey = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, "0")}-${String(dayDate.getDate()).padStart(2, "0")}`;
          const isToday = dayKey === todayKey;
          if (!slots.length) {
            return (
              <div
                key={day}
                className={`rounded-2xl border p-4 ${isToday ? "border-primary/40 bg-primary/5" : "border-dashed border-border bg-surface/50"}`}
              >
                <p className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted">
                  <span>{DAY_ABBR[day]}</span>
                  {isToday ? <span className="badge badge-primary !text-[10px]">Today</span> : null}
                </p>
                <p className="mt-2 text-xs text-text-muted">{dateStr(dayIdx)}</p>
                <p className="mt-3 text-center text-xs text-text-muted">{t('timetable_display.free')}</p>
              </div>
            );
          }

          return (
            <div key={day} className={`rounded-2xl border bg-surface p-4 ${isToday ? "border-primary/40" : "border-border"}`} style={{ boxShadow: "var(--shadow-card)" }}>
              <div className="mb-3 flex items-center justify-between">
                <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-text-secondary">
                  <span>{DAY_ABBR[day]}</span>
                  {isToday ? <span className="badge badge-primary !text-[10px]">Today</span> : null}
                </p>
                <p className="text-xs font-medium tabular-nums text-text-muted">{dateStr(dayIdx)}</p>
              </div>
              <div className="space-y-2">
                {slots.map((slot) => (
                  <div
                    key={slot.id}
                    className={`rounded-xl border-l-4 p-3 text-xs transition-all hover:shadow-sm ${getSubjectColor(slot.subject)}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-text-primary truncate">{slot.subject}</span>
                      {slot.type ? (
                        <span className="shrink-0 rounded-md bg-background px-1.5 py-0.5 text-[10px] font-bold text-text-muted uppercase">
                          {t(`timetable_display.${TYPE_LABEL_KEYS[slot.type] || slot.type}`) || slot.type}
                        </span>
                      ) : null}
                    </div>
                    {slot.topic && slot.topic !== slot.subject ? (
                      <p className="mt-0.5 truncate text-text-secondary">{slot.topic}</p>
                    ) : null}
                    <div className="mt-1.5 flex items-center gap-3 text-text-muted">
                      <span className="flex items-center gap-1">
                        <Clock size={10} /> {slot.timeSlot}
                      </span>
                      <span>{slot.duration}{t('timetable_display.minutes_suffix')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
