import { ArrowRight, CheckCircle, XCircle, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "./EmptyState.jsx";
import { getPresentationExercise, shuffleArray } from "../utils/shuffle.js";

export function LessonPlayer({ lesson, onComplete, onExerciseSubmit }) {
  const { t } = useTranslation();
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Preserve progress: presentation order/variants are fixed for this lesson instance, not regenerated
  const presentationExercises = useMemo(() => {
    const base = lesson?.exercises || [];
    // Pick random variant per exercise (if variants exist) – variants pre-generated and stored in Firestore
    // Do NOT regenerate lesson – only presentation selection changes per load
    return base.map((ex) => getPresentationExercise(ex));
  }, [lesson?.id]);
  const exercises = presentationExercises;
  const currentExercise = exercises[currentExerciseIndex];
  const progress = exercises.length ? ((currentExerciseIndex + 1) / exercises.length) * 100 : 0;

  const handleAnswer = (answer) => {
    setUserAnswers((prev) => ({
      ...prev,
      [currentExercise.id]: answer,
    }));

    if (onExerciseSubmit) {
      onExerciseSubmit(lesson.id, currentExercise.id, answer);
    }
  };

  const handleNext = () => {
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex((prev) => prev + 1);
    } else {
      setShowResults(true);
    }
  };

  const handleComplete = async () => {
    if (saved) return;
    setIsSubmitting(true);
    const correctCount = exercises.filter((ex) => {
        const userAnswer = userAnswers[ex.id];
        return userAnswer === ex.correctAnswer;
    }).length;

    const perfect = correctCount === exercises.length;
    const baseXP = Number(lesson.xpReward || 15);
    const totalXP = perfect ? baseXP * 1.5 : baseXP * (correctCount / Math.max(exercises.length, 1));

    setXpEarned(Math.round(totalXP));
    setCompleted(true);

    if (onComplete) {
      await onComplete(lesson.id, Math.round(totalXP), perfect, correctCount, exercises.length);
    }
    setSaved(true);
    setIsSubmitting(false);
  };

  const getAnswerStatus = (exerciseId, answer) => {
    const exercise = exercises.find((e) => e.id === exerciseId);
    if (!exercise) return null;
    return answer === exercise.correctAnswer ? "correct" : "incorrect";
  };

  if (completed) {
    const correctCount = exercises.filter((ex) => userAnswers[ex.id] === ex.correctAnswer).length;
    return (
      <div className="mx-auto max-w-2xl p-4 text-center sm:p-6">
        <div className="icon-tile mx-auto" style={{ width: "3rem", height: "3rem", background: "var(--color-success)", color: "#fff" }}>
          <CheckCircle size={26} />
        </div>
        <p className="eyebrow mt-4" style={{ color: "var(--color-success)" }}>{t("lesson.completed")}</p>
        <h2 className="mt-1 text-text-primary">{lesson.title}</h2>
        <div className="mx-auto mt-5 grid max-w-sm grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-surface px-4 py-3">
            <div className="text-xl font-extrabold tabular-nums text-primary">{correctCount}/{exercises.length}</div>
            <div className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted">{t("lesson.score")}</div>
          </div>
          <div className="rounded-xl border border-border bg-surface px-4 py-3">
            <div className="flex items-center justify-center gap-1 text-xl font-extrabold tabular-nums text-warning"><Zap size={16} />{xpEarned}</div>
            <div className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted">{t("lesson.xp_earned")}</div>
          </div>
        </div>
        <p className="mt-4 text-[13px] text-text-muted">{t("lesson.progress_saved")}</p>
      </div>
    );
  }

  if (showResults) {
    return (
      <div className="mx-auto max-w-2xl p-4 sm:p-6">
        <p className="eyebrow">{t("lesson.exercise_of", { current: exercises.length, total: exercises.length })}</p>
        <h2 className="mt-1 text-text-primary">{t("lesson.results")}</h2>
        <div className="mt-5 space-y-3">
          {exercises.map((exercise, index) => {
            const userAnswer = userAnswers[exercise.id];
            const status = getAnswerStatus(exercise.id, userAnswer);

            return (
              <div
                key={exercise.id}
                className={`rounded-xl border p-4 sm:p-5 ${
                  status === "correct"
                    ? "border-success/30 bg-success/5"
                    : "border-error/30 bg-error/5"
                }`}
              >
                <div className="flex items-start gap-3">
                  {status === "correct" ? (
                    <CheckCircle size={18} className="mt-0.5 shrink-0 text-success" />
                  ) : (
                    <XCircle size={18} className="mt-0.5 shrink-0 text-error" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 text-sm font-bold text-text-primary">
                      {index + 1}. {exercise.question}
                    </div>
                    <div className="mb-1.5 text-sm text-text-secondary">
                      {t("lesson.your_answer")}<span className="font-medium text-text-primary">{userAnswer || t("lesson.no_answer")}</span>
                    </div>
                    <div className="text-sm text-text-secondary">
                      {t("lesson.correct_answer")}<span className="font-bold text-text-primary">{exercise.correctAnswer}</span>
                    </div>
                    {exercise.explanation && (
                      <div className="mt-3 rounded-lg border border-border bg-surface p-3 text-sm italic text-text-secondary">
                        {exercise.explanation}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={handleComplete}
          disabled={isSubmitting || saved}
          className="btn-primary mt-6 w-full !py-3.5"
        >
          {isSubmitting ? t("common.saving") : saved ? t("common.saved") : t("lesson.complete_lesson")}
        </button>
      </div>
    );
  }

  if (!currentExercise) {
    return (
      <div className="mx-auto max-w-2xl p-4 sm:p-6">
        <EmptyState
          title={t("lesson.no_exercises")}
          copy={t("lesson.no_exercises_desc")}
          action={
            <button
              type="button"
              onClick={() => handleComplete()}
              disabled={isSubmitting || saved}
              className="btn-primary"
            >
              {isSubmitting ? t("common.saving") : saved ? t("common.saved") : t("lesson.mark_complete")}
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <div className="mb-6">
        <div className="mb-2 flex justify-between text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted">
          <span>{t("lesson.exercise_of", { current: currentExerciseIndex + 1, total: exercises.length })}</span>
          <span className="tabular-nums">{Math.round(progress)}%</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="mb-6 space-y-4">
        <div className="card card-pad">
          <p className="eyebrow">{t("lesson.exercise_of", { current: currentExerciseIndex + 1, total: exercises.length })}</p>
          <h2 className="mt-1 text-text-primary">{lesson.title}</h2>
          {lesson.summary && <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">{lesson.summary}</p>}
        </div>

        {lesson.explanation && (
          <div className="card card-pad">
            <h3 className="mb-2.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-text-muted">
              <Zap size={14} className="text-primary" />
              {t("lesson.core_concept")}
            </h3>
            <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-text-secondary">
              {lesson.explanation}
            </div>
          </div>
        )}

        {lesson.examples && lesson.examples.length > 0 && (
          <div className="card card-pad">
            <h3 className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-text-muted">{t("lesson.examples")}</h3>
            <ul className="list-disc space-y-1.5 pl-5 text-[15px] text-text-secondary">
              {lesson.examples.map((example, index) => (
                <li key={index} className="pl-1">{example}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="card card-pad mb-6">
        <ExerciseRenderer
          key={currentExercise.id}
          exercise={currentExercise}
          userAnswer={userAnswers[currentExercise.id]}
          onAnswer={handleAnswer}
        />
      </div>

      <div className="flex justify-between gap-3">
        <button
          type="button"
          onClick={() => setCurrentExerciseIndex((prev) => Math.max(0, prev - 1))}
          disabled={currentExerciseIndex === 0}
          className="btn-ghost"
        >
          {t("common.back")}
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={!userAnswers[currentExercise.id]}
          className="btn-primary"
        >
          {currentExerciseIndex === exercises.length - 1 ? t("common.finish") : t("common.next")}
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

function ExerciseRenderer({ exercise, userAnswer, onAnswer }) {
  switch (exercise.type) {
    case "matchPairs":
      return <MatchPairs exercise={exercise} userAnswer={userAnswer} onAnswer={onAnswer} />;
    case "ordering":
    case "arrangeOrder":
      return <ArrangeOrder exercise={exercise} userAnswer={userAnswer} onAnswer={onAnswer} />;
    case "fillBlank":
      return <FillBlank exercise={exercise} userAnswer={userAnswer} onAnswer={onAnswer} />;
    case "shortAnswer":
    case "typeAnswer":
      return <TypeAnswer exercise={exercise} userAnswer={userAnswer} onAnswer={onAnswer} />;
    case "trueFalse":
      return <TrueFalse exercise={exercise} userAnswer={userAnswer} onAnswer={onAnswer} />;
    default:
      return <MultipleChoice exercise={exercise} userAnswer={userAnswer} onAnswer={onAnswer} />;
  }
}

function TrueFalse({ exercise, userAnswer, onAnswer }) {
  const { t } = useTranslation();
  return (
    <div>
      <h3 className="text-lg font-bold text-text-primary mb-4">{exercise.question}</h3>
      <div className="flex gap-4">
        {[t("lesson.true"), t("lesson.false")].map((option) => (
          <button
            key={option}
            onClick={() => onAnswer(option)}
            className={`flex-1 p-4 text-center rounded-xl border-2 transition-all font-bold ${
              userAnswer === option
                ? "border-primary bg-primary/10 text-primary shadow-sm"
                : "border-border bg-surface text-text-secondary hover:border-primary/50 hover:bg-surface/80"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function MultipleChoice({ exercise, userAnswer, onAnswer }) {
  // Dynamic answer order: Fisher-Yates shuffle each mount, never index-equality
  const shuffledOptions = useMemo(() => shuffleArray(exercise.options || []), [exercise.id]);
  return (
    <div>
      <h3 className="text-lg font-bold text-text-primary mb-4">{exercise.question}</h3>
      {exercise.context && <p className="text-sm text-text-secondary mb-3 bg-background p-3 rounded-lg border border-border">{exercise.context}</p>}
      <div className="space-y-3">
        {shuffledOptions.map((option, index) => (
          <button
            key={`${exercise.id}-opt-${index}-${option}`}
            onClick={() => onAnswer(option)}
            className={`w-full p-4 text-left rounded-xl border-2 transition-all font-medium ${
              userAnswer === option
                ? "border-primary bg-primary/10 text-primary shadow-sm"
                : "border-border bg-surface text-text-secondary hover:border-primary/50 hover:bg-surface/80"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function FillBlank({ exercise, userAnswer, onAnswer }) {
  const { t } = useTranslation();
  return (
    <div>
      <h3 className="text-lg font-bold text-text-primary mb-4">{exercise.question}</h3>
      <input
        type="text"
        value={userAnswer || ""}
        onChange={(e) => onAnswer(e.target.value)}
        placeholder={t("lesson.type_answer_placeholder")}
        className="w-full p-4 border-2 border-border bg-background rounded-xl focus:border-primary focus:outline-none text-text-primary transition-all"
      />
    </div>
  );
}

function TypeAnswer({ exercise, userAnswer, onAnswer }) {
  const { t } = useTranslation();
  return (
    <div>
      <h3 className="text-lg font-bold text-text-primary mb-4">{exercise.question}</h3>
      <textarea
        value={userAnswer || ""}
        onChange={(e) => onAnswer(e.target.value)}
        placeholder={t("lesson.type_answer_placeholder")}
        rows={4}
        className="w-full p-4 border-2 border-border bg-background rounded-xl focus:border-primary focus:outline-none resize-none text-text-primary transition-all"
      />
    </div>
  );
}

function MatchPairs({ exercise, userAnswer: _userAnswer, onAnswer }) {
  const { t } = useTranslation();
  const pairs = exercise.pairs || [];
  // True randomization: independently shuffle left/right via Fisher-Yates each mount – never rely on index equality
  const shuffledPairs = useMemo(() => shuffleArray(pairs), [exercise.id]);
  // We keep original pairing for grading via ids, but presentation order is shuffled
  const [selectedLeft, setSelectedLeft] = useState(null);
  const [matchedPairs, setMatchedPairs] = useState([]);

  const handleLeftClick = (item) => {
    setSelectedLeft(item);
  };

  const handleRightClick = (item) => {
    if (selectedLeft) {
      const newMatch = { left: selectedLeft, right: item };
      const newMatches = [...matchedPairs, newMatch];
      setMatchedPairs(newMatches);
      setSelectedLeft(null);

      if (newMatches.length === pairs.length) {
        const answer = newMatches.map(m => `${m.left.id}-${m.right.id}`).join(',');
        onAnswer(answer);
      }
    }
  };

  const leftItemsShuffled = useMemo(() => {
    const left = shuffledPairs.map(p => p.left);
    return shuffleArray(left);
  }, [shuffledPairs]);
  const rightItemsShuffled = useMemo(() => {
    const right = shuffledPairs.map(p => p.right);
    return shuffleArray(right);
  }, [shuffledPairs]);
  const leftItems = leftItemsShuffled.filter(item => !matchedPairs.find(m => m.left.id === item.id));
  const rightItems = rightItemsShuffled.filter(item => !matchedPairs.find(m => m.right.id === item.id));

  if (pairs.length === 0) {
    return (
      <div>
        <h3 className="mb-4 text-lg font-bold text-text-primary">{exercise.question}</h3>
        <p className="alert alert-warning" role="alert">This activity couldn't load properly. Please try regenerating the lesson.</p>
      </div>
    );
  }
  return (
    <div>
      <h3 className="text-lg font-bold text-text-primary mb-4">{exercise.question}</h3>
      <p className="text-sm text-text-secondary mb-4">{t("lesson.match_pairs_instruction")}</p>
      <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
        <div className="space-y-2">
          {leftItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleLeftClick(item)}
              className={`w-full p-3 text-left rounded-xl border-2 transition-all font-medium ${
                selectedLeft?.id === item.id
                  ? "border-primary bg-primary/10 text-primary shadow-sm"
                  : "border-border bg-surface text-text-secondary hover:border-primary/50 hover:bg-surface/80"
              }`}
            >
              {item.text}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {rightItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleRightClick(item)}
              className="w-full p-3 text-left rounded-xl border-2 border-border bg-surface text-text-secondary hover:border-primary/50 hover:bg-surface/80 transition-all font-medium"
            >
              {item.text}
            </button>
          ))}
        </div>
      </div>
      {matchedPairs.length > 0 && (
        <div className="mt-4 p-3 bg-status-success/10 border border-status-success/20 rounded-xl text-center">
          <p className="text-sm font-bold text-status-success">{t("lesson.matched_count", { count: matchedPairs.length, total: pairs.length })}</p>
        </div>
      )}
    </div>
  );
}

function ArrangeOrder({ exercise, userAnswer: _userAnswer, onAnswer }) {
  const { t } = useTranslation();
  const [items, setItems] = useState(() => shuffleArray(exercise.items || []));

  const moveItem = (fromIndex, toIndex) => {
    const newItems = [...items];
    const [removed] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, removed);
    setItems(newItems);

    const answer = newItems.map(i => i.id).join(',');
    onAnswer(answer);
  };

  return (
    <div>
      <h3 className="text-lg font-bold text-text-primary mb-4">{exercise.question}</h3>
      <p className="text-sm text-text-secondary mb-4">{t("lesson.arrange_order_instruction")}</p>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="flex items-center gap-2 p-3 bg-surface border-2 border-border rounded-xl"
          >
            <div className="flex gap-1">
              <button
                onClick={() => moveItem(index, Math.max(0, index - 1))}
                disabled={index === 0}
                className="p-1 text-text-muted hover:text-primary disabled:opacity-30 transition-colors"
              >
                {t("lesson.up")}
              </button>
              <button
                onClick={() => moveItem(index, Math.min(items.length - 1, index + 1))}
                disabled={index === items.length - 1}
                className="p-1 text-text-muted hover:text-primary disabled:opacity-30 transition-colors"
              >
                {t("lesson.down")}
              </button>
            </div>
            <span className="flex-1 font-medium text-text-primary">{item.text}</span>
            <span className="text-text-muted text-sm font-bold">{index + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
