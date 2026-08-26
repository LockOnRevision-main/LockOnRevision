import { ChevronDown, ChevronRight, Lock, Play, Star, Trophy, Zap } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function ForgeCurriculumView({ subject, units, subUnits, lessons, onStartLesson }) {
  const { t } = useTranslation();
  const [expandedUnits, setExpandedUnits] = useState(new Set());
  const [expandedSubUnits, setExpandedSubUnits] = useState(new Set());

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
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-black text-text-primary mb-2 tracking-tight">{subject.title}</h1>
          {subject.description && (
            <p className="text-text-secondary text-base sm:text-lg leading-relaxed">{subject.description}</p>
          )}
          {subject.detectedSubject && (
            <span className="inline-block mt-3 px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-bold uppercase tracking-widest">
              {subject.detectedSubject}
            </span>
          )}
        </div>
      )}

      {sortedLessons.length > 0 && (
        <div className="flex flex-wrap gap-6 mb-8 p-6 bg-surface border border-border rounded-2xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-text-muted">{t("forge.total_xp_stat")}</div>
              <div className="font-black text-text-primary">
                {sortedLessons.reduce((sum, l) => sum + (l.xpEarned || 0), 0)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary/10 text-secondary">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-text-muted">{t("forge.completed_stat")}</div>
              <div className="font-black text-text-primary">
                {sortedLessons.filter((l) => l.completed).length} / {sortedLessons.length}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10 text-warning">
              <Star className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-text-muted">{t("forge.perfect_lessons")}</div>
              <div className="font-black text-text-primary">
                {sortedLessons.filter((l) => l.perfect).length}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {sortedUnits.length === 0 && (
          <div className="rounded-2xl border border-border bg-surface p-12 text-center">
            <p className="text-text-muted font-medium">{t("forge.no_units")}</p>
          </div>
        )}
        {sortedUnits.map((unit) => {
          const unitProgress = calculateUnitProgress(unit.id);
          const unitSubUnits = subUnits.filter((su) => su.unitId === unit.id).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          const isExpanded = expandedUnits.has(unit.id);

          return (
            <div key={unit.id} className="border border-border rounded-2xl overflow-hidden shadow-sm transition-all hover:shadow-md">
              <button
                onClick={() => toggleUnit(unit.id)}
                className="w-full p-5 flex items-center justify-between bg-surface hover:bg-card transition-colors"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-text-muted shrink-0" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-text-muted shrink-0" />
                  )}
                  <div className="flex-1 text-left min-w-0">
                    <h3 className="font-black text-text-primary text-lg truncate">{unit.title}</h3>
                    {unit.summary && <p className="text-sm text-text-secondary truncate">{unit.summary}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right hidden sm:block">
                    <div className="text-sm font-black text-text-primary">{unitProgress}%</div>
                  <div className="text-xs text-text-muted">
                    {t("forge.lessons_count", { completed: getUnitLessons(unit.id).filter((l) => l.completed).length, total: getUnitLessons(unit.id).length })}
                  </div>
                  </div>
                  <div className="w-20 h-2 bg-background rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${unitProgress}%` }}
                    />
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
                          onClick={() => toggleSubUnit(subUnit.id)}
                          className="w-full p-4 flex items-center justify-between hover:bg-surface transition-colors"
                        >
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            {isSubExpanded ? (
                              <ChevronDown className="w-4 h-4 text-text-muted shrink-0" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
                            )}
                            <div className="flex-1 text-left min-w-0">
                              <h4 className="font-bold text-text-primary truncate">{subUnit.title}</h4>
                              {subUnit.summary && <p className="text-sm text-text-secondary truncate">{subUnit.summary}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 shrink-0">
                            <div className="text-right hidden sm:block">
                              <div className="text-sm font-bold text-text-primary">{subUnitProgress}%</div>
                              <div className="text-xs text-text-muted">
                                {subUnitLessons.filter((l) => l.completed).length} / {subUnitLessons.length}
                              </div>
                            </div>
                            <div className="w-12 h-2 bg-background rounded-full overflow-hidden">
                              <div
                                className="h-full bg-secondary transition-all duration-500"
                                style={{ width: `${subUnitProgress}%` }}
                              />
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
                                      onClick={() => isLessonClickable(lesson) && !locked && onStartLesson(lesson)}
                                      disabled={locked || !isLessonClickable(lesson)}
                                      className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 text-left ${
                                        locked
                                          ? "border-border bg-background/50 cursor-not-allowed opacity-60"
                                          : lesson.completed
                                          ? "border-status-success/30 bg-status-success/10 hover:bg-status-success/20"
                                          : "border-primary/20 bg-primary/5 hover:bg-primary/10"
                                      }`}
                                    >
                                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0">
                                        {locked ? (
                                          <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-text-muted" />
                                        ) : lesson.completed ? (
                                          <Star className="w-5 h-5 sm:w-6 sm:h-6 text-status-success fill-status-success" />
                                        ) : (
                                          <Play className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="font-bold text-text-primary text-sm sm:text-base">
                                          <span className="text-text-muted mr-2">{t("forge.lesson_number", { number: index + 1 })}</span>
                                          <span className="truncate">{lesson.title}</span>
                                        </div>
                                        {lesson.concept && (
                                          <div className="text-sm text-text-secondary truncate">{lesson.concept}</div>
                                        )}
                                        <div className="flex items-center gap-3 mt-1 text-xs font-medium text-text-muted flex-wrap">
                                          <span>{lesson.durationMinutes || 3} {t("forge.minutes")}</span>
                                          <span>&bull;</span>
                                          <span>{lesson.xpReward || 15} {t("forge.xp_label")}</span>
                                          {lesson.perfect && <span className="text-warning font-bold">&bull; {t("forge.perfect_badge")}</span>}
                                        </div>
                                      </div>
                                      {lesson.completed && (
                                        <div className="text-status-success font-black text-sm shrink-0">
                                          {t("forge.xp_earned_badge", { xp: lesson.xpEarned || 0 })}
                                        </div>
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
