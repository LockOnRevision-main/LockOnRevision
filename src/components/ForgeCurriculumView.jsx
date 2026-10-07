import { CheckCircle2, ChevronDown, ChevronRight, Lock, Play, Star, Trophy, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export function ForgeCurriculumView({ subject, units, subUnits, lessons, onStartLesson }) {
  const { t } = useTranslation();
  const [expandedUnits, setExpandedUnits] = useState(new Set());
  const [expandedSubUnits, setExpandedSubUnits] = useState(new Set());

  // Open the first unit by default so the curriculum never looks empty.
  useEffect(() => {
    if (units?.length && expandedUnits.size === 0) {
      setExpandedUnits(new Set([units[0].id]));
    }
  }, [units, expandedUnits.size]);

  const toggleUnit = (unitId) => {
    setExpandedUnits((prev) => {
      const next = new Set(prev);
      next.has(unitId) ? next.delete(unitId) : next.add(unitId);
      return next;
    });
  };

  const toggleSubUnit = (subUnitId) => {
    setExpandedSubUnits((prev) => {
      const next = new Set(prev);
      next.has(subUnitId) ? next.delete(subUnitId) : next.add(subUnitId);
      return next;
    });
  };

  const getUnitLessons = (unitId) => {
    return lessons.filter((l) => l.unitId === unitId);
  };

  const getSubUnitLessons = (subUnitId) => {
    return lessons.filter((l) => l.subUnitId === subUnitId);
  };

  const calculateUnitProgress = (unitId) => {
    const unitLessons = getUnitLessons(unitId);
    if (unitLessons.length === 0) return 0;
    const completed = unitLessons.filter((l) => l.completed).length;
    return Math.round((completed / unitLessons.length) * 100);
  };

  const calculateSubUnitProgress = (subUnitId) => {
    const subUnitLessons = getSubUnitLessons(subUnitId);
    if (subUnitLessons.length === 0) return 0;
    const completed = subUnitLessons.filter((l) => l.completed).length;
    return Math.round((completed / subUnitLessons.length) * 100);
  };

  const isLessonLocked = (lesson, subUnitLessons) => {
    if (!lesson) return true;
    if (lesson.completed) return false;
    const lessonIndex = subUnitLessons.findIndex((l) => l && l.id === lesson.id);
    if (lessonIndex <= 0) return false;
    const previousLesson = subUnitLessons[lessonIndex - 1];
    return previousLesson ? !previousLesson.completed : false;
  };

  const isLessonClickable = (lesson) => {
    return lesson && !lesson.completed;
  };

  const sortedUnits = [...(units || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const sortedLessons = [...(lessons || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-8">
      {subject && (
        <div className="mb-6">
          <p className="eyebrow">{t("forge.curriculum")}</p>
          <h1 className="mt-1 text-text-primary">{subject.title}</h1>
          {subject.description && (
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-text-secondary">{subject.description}</p>
          )}
          {subject.detectedSubject && (
            <span className="badge badge-primary mt-3">
              {subject.detectedSubject}
            </span>
          )}
        </div>
      )}

      {sortedLessons.length > 0 && (
        <div className="card mb-6 flex flex-wrap gap-x-8 gap-y-4 p-5">
          <div className="flex items-center gap-3">
            <span className="icon-tile" style={{ width: "2.25rem", height: "2.25rem" }}>
              <Zap size={17} />
            </span>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted">{t("forge.total_xp_stat")}</div>
              <div className="font-extrabold tabular-nums text-text-primary">
                {sortedLessons.reduce((sum, l) => sum + (l.xpEarned || 0), 0).toLocaleString()}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="icon-tile" style={{ width: "2.25rem", height: "2.25rem" }}>
              <Trophy size={17} />
            </span>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted">{t("forge.completed_stat")}</div>
              <div className="font-extrabold tabular-nums text-text-primary">
                {sortedLessons.filter((l) => l.completed).length} / {sortedLessons.length}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="icon-tile" style={{ width: "2.25rem", height: "2.25rem" }}>
              <Star size={17} />
            </span>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted">{t("forge.perfect_lessons")}</div>
              <div className="font-extrabold tabular-nums text-text-primary">
                {sortedLessons.filter((l) => l.perfect).length}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {sortedUnits.length === 0 && (
          <div className="card p-8 text-center">
            <p className="text-sm font-medium text-text-muted">{t("forge.no_units")}</p>
          </div>
        )}
        {sortedUnits.map((unit) => {
          const unitProgress = calculateUnitProgress(unit.id);
          const unitSubUnits = subUnits.filter((su) => su.unitId === unit.id).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          const isExpanded = expandedUnits.has(unit.id);

          return (
            <div key={unit.id} className="card overflow-hidden">
              <button
                type="button"
                onClick={() => toggleUnit(unit.id)}
                aria-expanded={isExpanded}
                className="flex w-full items-center justify-between gap-3 bg-surface p-4 text-left transition-colors hover:bg-background/60 sm:p-5"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown size={18} className="shrink-0 text-text-muted" />
                  ) : (
                    <ChevronRight size={18} className="shrink-0 text-text-muted" />
                  )}
                  <div className="min-w-0 flex-1 text-left">
                    <h3 className="truncate font-bold text-text-primary">{unit.title}</h3>
                    {unit.summary && <p className="truncate text-[13px] text-text-secondary">{unit.summary}</p>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <div className="hidden text-right sm:block">
                    <div className="text-sm font-bold tabular-nums text-text-primary">{unitProgress}%</div>
                  <div className="text-xs tabular-nums text-text-muted">
                    {t("forge.lessons_count", { completed: getUnitLessons(unit.id).filter((l) => l.completed).length, total: getUnitLessons(unit.id).length })}
                  </div>
                  </div>
                  <div className="progress-track w-16 sm:w-20">
                    <div className="progress-fill" style={{ width: `${unitProgress}%` }} />
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-border bg-background/50">
                  {unitSubUnits.length === 0 && (
                    <div className="p-6 text-center text-sm text-text-muted">
                      {t("forge.no_sub_units")}
                    </div>
                  )}
                  {unitSubUnits.map((subUnit) => {
                    const subUnitProgress = calculateSubUnitProgress(subUnit.id);
                    const subUnitLessons = getSubUnitLessons(subUnit.id).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                    const isSubExpanded = expandedSubUnits.has(subUnit.id);

                    return (
                      <div key={subUnit.id} className="border-b border-border last:border-b-0">
                        <button
                          type="button"
                          onClick={() => toggleSubUnit(subUnit.id)}
                          aria-expanded={isSubExpanded}
                          className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-surface"
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            {isSubExpanded ? (
                              <ChevronDown size={15} className="shrink-0 text-text-muted" />
                            ) : (
                              <ChevronRight size={15} className="shrink-0 text-text-muted" />
                            )}
                            <div className="min-w-0 flex-1 text-left">
                              <h4 className="truncate text-sm font-bold text-text-primary">{subUnit.title}</h4>
                              {subUnit.summary && <p className="truncate text-[13px] text-text-secondary">{subUnit.summary}</p>}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            <div className="hidden text-right sm:block">
                              <div className="text-[13px] font-bold tabular-nums text-text-primary">{subUnitProgress}%</div>
                              <div className="text-xs tabular-nums text-text-muted">
                                {subUnitLessons.filter((l) => l.completed).length} / {subUnitLessons.length}
                              </div>
                            </div>
                            <div className="progress-track w-12">
                              <div className="progress-fill" style={{ width: `${subUnitProgress}%` }} />
                            </div>
                          </div>
                        </button>

                        {isSubExpanded && (
                          <div className="border-t border-border bg-surface p-4">
                            {subUnitLessons.length === 0 ? (
                              <p className="text-center text-sm text-text-muted py-4">{t("forge.no_lessons")}</p>
                            ) : (
                              <div className="space-y-3">
                                {subUnitLessons.map((lesson, index) => {
                                  const locked = isLessonLocked(lesson, subUnitLessons);
                                  return (
                                    <button
                                      key={lesson.id}
                                      type="button"
                                      onClick={() => isLessonClickable(lesson) && !locked && onStartLesson(lesson)}
                                      disabled={locked || !isLessonClickable(lesson)}
                                      aria-label={`${t("forge.lesson_number", { number: index + 1 })}: ${lesson.title}`}
                                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors sm:p-4 ${
                                        locked
                                          ? "cursor-not-allowed border-border bg-background/50 opacity-60"
                                          : lesson.completed
                                          ? "border-success/30 bg-success/5 hover:border-success/50"
                                          : "border-border bg-background hover:border-primary/50"
                                      }`}
                                    >
                                      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
                                        locked ? "bg-background text-text-muted" : lesson.completed ? "bg-success/15 text-success" : "bg-primary/10 text-primary"
                                      }`}>
                                        {locked ? (
                                          <Lock size={16} />
                                        ) : lesson.completed ? (
                                          <CheckCircle2 size={17} />
                                        ) : (
                                          <Play size={16} />
                                        )}
                                      </span>
                                      <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-bold text-text-primary sm:text-[15px]">
                                          <span className="mr-2 font-semibold tabular-nums text-text-muted">{index + 1}.</span>
                                          {lesson.title}
                                        </span>
                                        {lesson.concept && (
                                          <span className="block truncate text-[13px] text-text-secondary">{lesson.concept}</span>
                                        )}
                                        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-medium tabular-nums text-text-muted">
                                          <span>{lesson.durationMinutes || 3} {t("forge.minutes")}</span>
                                          <span aria-hidden="true">·</span>
                                          <span>{lesson.xpReward || 15} {t("forge.xp_label")}</span>
                                          {lesson.perfect && <span className="font-bold text-warning">· {t("forge.perfect_badge")}</span>}
                                        </span>
                                      </span>
                                      {lesson.completed && (
                                        <span className="shrink-0 rounded-full bg-success/10 px-2.5 py-1 text-xs font-bold tabular-nums text-success">
                                          +{lesson.xpEarned || 0} {t("forge.xp_label")}
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
