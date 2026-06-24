import { ChevronDown, ChevronRight, Lock, Play, Star, Trophy, Zap } from "lucide-react";
import { useState } from "react";

export function ForgeCurriculumView({ subject, units, subUnits, lessons, onStartLesson }) {
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

  const isLessonLocked = (lesson, allLessons) => {
    if (lesson.completed) return false;
    const lessonIndex = allLessons.findIndex((l) => l.id === lesson.id);
    if (lessonIndex === 0) return false;
    const previousLesson = allLessons[lessonIndex - 1];
    return !previousLesson?.completed;
  };

  const sortedUnits = [...units].sort((a, b) => a.order - b.order);
  const sortedLessons = [...lessons].sort((a, b) => a.order - b.order);

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Subject Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{subject?.title}</h1>
        <p className="text-gray-600">{subject?.description}</p>
        {subject?.detectedSubject && (
          <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
            {subject.detectedSubject}
          </span>
        )}
      </div>

      {/* Stats Bar */}
      <div className="flex gap-6 mb-8 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          <div>
            <div className="text-sm text-gray-600">Total XP</div>
            <div className="font-bold text-gray-900">
              {sortedLessons.reduce((sum, l) => sum + (l.xpEarned || 0), 0)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <div>
            <div className="text-sm text-gray-600">Completed</div>
            <div className="font-bold text-gray-900">
              {sortedLessons.filter((l) => l.completed).length} / {sortedLessons.length}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500" />
          <div>
            <div className="text-sm text-gray-600">Perfect Lessons</div>
            <div className="font-bold text-gray-900">
              {sortedLessons.filter((l) => l.perfect).length}
            </div>
          </div>
        </div>
      </div>

      {/* Units */}
      <div className="space-y-4">
        {sortedUnits.map((unit) => {
          const unitProgress = calculateUnitProgress(unit.id);
          const unitSubUnits = subUnits.filter((su) => su.unitId === unit.id).sort((a, b) => a.order - b.order);
          const isExpanded = expandedUnits.has(unit.id);

          return (
            <div key={unit.id} className="border border-gray-200 rounded-xl overflow-hidden">
              {/* Unit Header */}
              <button
                onClick={() => toggleUnit(unit.id)}
                className="w-full p-4 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-gray-900">{unit.title}</h3>
                    <p className="text-sm text-gray-600">{unit.summary}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">{unitProgress}%</div>
                    <div className="text-xs text-gray-500">
                      {getUnitLessons(unit.id).filter((l) => l.completed).length} / {getUnitLessons(unit.id).length} lessons
                    </div>
                  </div>
                  <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all"
                      style={{ width: `${unitProgress}%` }}
                    />
                  </div>
                </div>
              </button>

              {/* Sub-Units */}
              {isExpanded && (
                <div className="border-t border-gray-200 bg-gray-50">
                  {unitSubUnits.map((subUnit) => {
                    const subUnitProgress = calculateSubUnitProgress(subUnit.id);
                    const subUnitLessons = getSubUnitLessons(subUnit.id).sort((a, b) => a.order - b.order);
                    const isSubExpanded = expandedSubUnits.has(subUnit.id);

                    return (
                      <div key={subUnit.id} className="border-b border-gray-200 last:border-b-0">
                        {/* Sub-Unit Header */}
                        <button
                          onClick={() => toggleSubUnit(subUnit.id)}
                          className="w-full p-4 flex items-center justify-between hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-4 flex-1">
                            {isSubExpanded ? (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            )}
                            <div className="flex-1 text-left">
                              <h4 className="font-medium text-gray-900">{subUnit.title}</h4>
                              <p className="text-sm text-gray-600">{subUnit.summary}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-sm font-medium text-gray-900">{subUnitProgress}%</div>
                              <div className="text-xs text-gray-500">
                                {subUnitLessons.filter((l) => l.completed).length} / {subUnitLessons.length}
                              </div>
                            </div>
                            <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all"
                                style={{ width: `${subUnitProgress}%` }}
                              />
                            </div>
                          </div>
                        </button>

                        {/* Lessons */}
                        {isSubExpanded && (
                          <div className="border-t border-gray-200 bg-white p-4">
                            <div className="space-y-2">
                              {subUnitLessons.map((lesson) => {
                                const locked = isLessonLocked(lesson, sortedLessons);
                                return (
                                  <button
                                    key={lesson.id}
                                    onClick={() => !locked && onStartLesson(lesson)}
                                    disabled={locked}
                                    className={`w-full p-4 rounded-lg border-2 transition-all flex items-center gap-4 ${
                                      locked
                                        ? "border-gray-200 bg-gray-50 cursor-not-allowed opacity-60"
                                        : lesson.completed
                                        ? "border-green-200 bg-green-50 hover:bg-green-100"
                                        : "border-purple-200 bg-purple-50 hover:bg-purple-100"
                                    }`}
                                  >
                                    <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0">
                                      {locked ? (
                                        <Lock className="w-6 h-6 text-gray-400" />
                                      ) : lesson.completed ? (
                                        <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                                      ) : (
                                        <Play className="w-6 h-6 text-purple-500" />
                                      )}
                                    </div>
                                    <div className="flex-1 text-left">
                                      <div className="font-medium text-gray-900">{lesson.title}</div>
                                      <div className="text-sm text-gray-600">{lesson.concept}</div>
                                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                        <span>{lesson.durationMinutes} min</span>
                                        <span>&bull;</span>
                                        <span>{lesson.xpReward} XP</span>
                                        {lesson.perfect && <span className="text-yellow-600">&bull; Perfect!</span>}
                                      </div>
                                    </div>
                                    {lesson.completed && (
                                      <div className="text-green-600 font-semibold">
                                        Done: {lesson.xpEarned} XP
                                      </div>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
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
