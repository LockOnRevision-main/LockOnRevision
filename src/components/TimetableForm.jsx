import { Plus, Trash2, Clock, BookOpen, GraduationCap, BarChart3, Calendar2, ArrowDown } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { loadPreferencesLocally } from "../services/timetableService.js";

const DURATION_OPTIONS = [
  { value: 2, label: "2 weeks" },
  { value: 4, label: "4 weeks" },
  { value: 6, label: "6 weeks" },
  { value: 8, label: "8 weeks" },
];

const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

const EMPTY_SUBJECT = { title: "", difficulty: "medium", confidence: 5, currentChapter: "" };

export function TimetableForm({ onGenerate, busy }) {
  const { t } = useTranslation();
  const saved = loadPreferencesLocally();
  const [grade, setGrade] = useState(saved?.grade || "");
  const [dailyMinutes, setDailyMinutes] = useState(Number(saved?.dailyMinutes) || 60);
  const [weekendMinutes, setWeekendMinutes] = useState(Number(saved?.weekendMinutes) || 60);
  const [preferredTime, setPreferredTime] = useState(saved?.preferredTime || "09:00");
  const [durationWeeks, setDurationWeeks] = useState(saved?.durationWeeks || 4);
  const [startDate, setStartDate] = useState(saved?.startDate ? new Date(saved.startDate) : new Date());
  const [subjects, setSubjects] = useState(
    saved?.subjects?.length ? saved.subjects : [{ ...EMPTY_SUBJECT }],
  );
  const [examDates, setExamDates] = useState(saved?.examDates || []);

  const addSubject = () => setSubjects((p) => [...p, { ...EMPTY_SUBJECT }]);
  const removeSubject = (i) => setSubjects((p) => p.filter((_, idx) => idx !== i));
  const updateSubject = (i, field, value) =>
    setSubjects((p) => p.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));

  const addExam = () => setExamDates((p) => [...p, { subject: "", date: "" }]);
  const removeExam = (i) => setExamDates((p) => p.filter((_, idx) => idx !== i));
  const updateExam = (i, field, value) =>
    setExamDates((p) => p.map((e, idx) => (idx === i ? { ...e, [field]: value } : e)));

  const handleSubmit = (e) => {
    e.preventDefault();
    const validSubjects = subjects.filter((s) => s.title.trim());
    if (!validSubjects.length) return;

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + durationWeeks * 7);

    onGenerate({
      grade,
      dailyMinutes: Number(dailyMinutes),
      weekendMinutes: Number(weekendMinutes),
      preferredTime,
      durationWeeks: Number(durationWeeks),
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
      subjects: validSubjects,
      examDates: examDates.filter((e) => e.subject.trim() && e.date),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-fadeIn">
      {/* Basic Settings */}
      <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
            <GraduationCap size={22} />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight text-text-primary">{t("timetable.your_profile")}</h2>
            <p className="text-xs text-text-secondary">{t("timetable.study_situation")}</p>
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-text-secondary">
              {t("timetable.grade_year")}
            </label>
            <input
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              placeholder={t("timetable.grade_placeholder")}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary transition-all"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-text-secondary">
              {t("timetable.daily_study_time")}
            </label>
            <div className="relative">
              <Clock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="number"
                min={15}
                max={600}
                value={dailyMinutes}
                onChange={(e) => setDailyMinutes(Number(e.target.value))}
                className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm text-text-primary outline-none focus:border-primary transition-all"
              />
            </div>
            <p className="mt-1 text-[11px] text-text-muted">{t("timetable.minutes_weekday")}</p>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-text-secondary">
              {t("timetable.weekend_study_time")}
            </label>
            <div className="relative">
              <Clock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="number"
                min={0}
                max={600}
                value={weekendMinutes}
                onChange={(e) => setWeekendMinutes(Number(e.target.value))}
                className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm text-text-primary outline-none focus:border-primary transition-all"
              />
            </div>
            <p className="mt-1 text-[11px] text-text-muted">{t("timetable.minutes_weekend")}</p>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-text-secondary">
              {t("timetable.preferred_start")}
            </label>
            <input
              type="time"
              value={preferredTime}
              onChange={(e) => setPreferredTime(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary transition-all"
            />
          </div>
        </div>
      </section>

      {/* Duration */}
      <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <div className="rounded-xl bg-primary/10 p-2 text-primary">
            <Calendar2 size={18} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-text-secondary">
              {t("timetable.start_date")}
            </label>
            <input
              type="date"
              value={startDate.toISOString().split("T")[0]}
              onChange={(e) => {
                setStartDate(new Date(e.target.value));
              }}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary transition-all"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {DURATION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setDurationWeeks(opt.value)}
              className={`rounded-xl border-2 px-5 py-3 text-sm font-black transition-all ${
                durationWeeks === opt.value
                  ? "border-primary bg-primary text-white shadow-md"
                  : "border-border bg-background text-text-secondary hover:border-primary/50"
              }`}
            >
              {t(`timetable.duration_${opt.value}w`)}
              </button>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="rounded-xl bg-primary/10 p-2 text-primary">
            <ArrowDown size={16} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-text-secondary">
              {t("timetable.end_date")}
            </label>
            <input
              type="date"
              readOnly
              value={
                new Date(startDate.getTime() + durationWeeks * 7 * 24 * 60 * 60 * 1000)
                  .toISOString()
                  .split("T")[0]
              }
              className="w-40 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary transition-all"
            />
          </div>
        </div>
      </section>

      {/* Subjects */}
      <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
              <BookOpen size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-text-primary">{t("timetable.subjects_heading")}</h2>
              <p className="text-xs text-text-secondary">{t("timetable.subjects_desc")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={addSubject}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-black text-white transition-all hover:bg-primary-active"
          >
            <Plus size={14} /> {t("common.add")}
          </button>
        </div>
        <div className="space-y-3">
          {subjects.map((subject, i) => (
            <div
              key={i}
              className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-background p-4"
            >
              <div className="min-w-0 flex-1">
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-text-muted">{t("timetable.subject")}</label>
                <input
                  value={subject.title}
                  onChange={(e) => updateSubject(i, "title", e.target.value)}
                  placeholder={t("timetable.subject_placeholder")}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-primary transition-all"
                />
              </div>
              <div className="w-24">
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-text-muted">{t("timetable.difficulty_label")}</label>
                <select
                  value={subject.difficulty}
                  onChange={(e) => updateSubject(i, "difficulty", e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-primary transition-all"
                >
                  {DIFFICULTY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{t(`timetable.${o.value}`)}</option>
                  ))}
                </select>
              </div>
              <div className="w-20">
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-text-muted">{t("timetable.confidence_label")}</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={subject.confidence}
                  onChange={(e) => updateSubject(i, "confidence", Number(e.target.value))}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-primary transition-all"
                />
              </div>
              <div className="min-w-0 flex-[2]">
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-text-muted">{t("timetable.current_chapter_label")}</label>
                <input
                  value={subject.currentChapter}
                  onChange={(e) => updateSubject(i, "currentChapter", e.target.value)}
                  placeholder={t("timetable.chapter_placeholder")}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-primary transition-all"
                />
              </div>
              {subjects.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeSubject(i)}
                  className="rounded-xl border border-border bg-surface p-2.5 text-text-muted transition-all hover:bg-status-error/10 hover:text-status-error"
                  aria-label={t("timetable.remove_subject")}
                >
                  <Trash2 size={16} />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      {/* Exam Dates */}
      <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
              <GraduationCap size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-text-primary">{t("timetable.exam_dates")}</h2>
              <p className="text-xs text-text-secondary">{t("timetable.exam_dates_desc")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={addExam}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-black text-white transition-all hover:bg-primary-active"
          >
            <Plus size={14} /> {t("common.add")}
          </button>
        </div>
        {examDates.length === 0 ? (
          <p className="text-sm italic text-text-muted">{t("timetable.no_exams")}</p>
        ) : (
          <div className="space-y-3">
            {examDates.map((exam, i) => (
              <div key={i} className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-background p-4">
                <div className="min-w-0 flex-1">
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-text-muted">{t("timetable.subject")}</label>
                  <input
                    value={exam.subject}
                    onChange={(e) => updateExam(i, "subject", e.target.value)}
                    placeholder={t("timetable.exam_placeholder")}
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-primary transition-all"
                  />
                </div>
                <div className="w-44">
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-text-muted">{t("timetable.date_label")}</label>
                  <input
                    type="date"
                    value={exam.date}
                    onChange={(e) => updateExam(i, "date", e.target.value)}
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-primary transition-all"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeExam(i)}
                  className="rounded-xl border border-border bg-surface p-2.5 text-text-muted transition-all hover:bg-status-error/10 hover:text-status-error"
                  aria-label={t("timetable.remove_exam")}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Submit */}
      <button
        type="submit"
        disabled={busy || !subjects.some((s) => s.title.trim())}
        className="w-full rounded-2xl bg-gradient-to-r from-secondary to-primary py-4 text-lg font-black text-white shadow-lg transition-all hover:scale-[1.01] hover:shadow-xl disabled:opacity-40 disabled:pointer-events-none"
      >
        {busy ? t("timetable.generating") : t("timetable.generate_timetable")}
      </button>
    </form>
  );
}
