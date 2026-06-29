import { ArrowRight, CheckCircle, XCircle, Zap } from "lucide-react";
import { useState } from "react";

export function LessonPlayer({ lesson, onComplete, onExerciseSubmit }) {
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const exercises = lesson.exercises || [];
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
    setIsSubmitting(true);
    const correctCount = exercises.filter((ex) => {
        const userAnswer = userAnswers[ex.id];
        // Basic check, depends on exercise type
        return userAnswer === ex.correctAnswer;
    }).length;
    
    const perfect = correctCount === exercises.length;
    const baseXP = Number(lesson.xpReward || 15);
    const totalXP = perfect ? baseXP * 1.5 : baseXP * (correctCount / exercises.length);

    setXpEarned(Math.round(totalXP));
    setCompleted(true);
    if (onComplete) {
      await onComplete(lesson.id, Math.round(totalXP), perfect);
    }
    setIsSubmitting(false);
  };

  const getAnswerStatus = (exerciseId, answer) => {
    const exercise = exercises.find((e) => e.id === exerciseId);
    if (!exercise) return null;
    return answer === exercise.correctAnswer ? "correct" : "incorrect";
  };

  if (completed) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <div className="w-24 h-24 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Lesson Complete!</h2>
        <p className="text-gray-600 mb-6">{lesson.title}</p>
        <div className="flex justify-center gap-8 mb-8">
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">
              {exercises.filter((ex) => userAnswers[ex.id] === ex.correctAnswer).length}/{exercises.length}
            </div>
            <div className="text-sm text-gray-600">Correct</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-600 flex items-center gap-2">
              <Zap className="w-6 h-6" />
              {xpEarned}
            </div>
            <div className="text-sm text-gray-600">XP Earned</div>
          </div>
        </div>
        <button
          onClick={handleComplete}
          disabled={isSubmitting}
          className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-purple-400"
        >
          {isSubmitting ? "Saving..." : "Continue Learning"}
        </button>
      </div>
    );
  }

  if (showResults) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Lesson Results</h2>
        <div className="space-y-4">
          {exercises.map((exercise, index) => {
            const userAnswer = userAnswers[exercise.id];
            const status = getAnswerStatus(exercise.id, userAnswer);

            return (
              <div
                key={exercise.id}
                className={`p-4 rounded-lg border-2 ${
                  status === "correct"
                    ? "border-green-200 bg-green-50"
                    : "border-red-200 bg-red-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  {status === "correct" ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 mb-2">
                      {index + 1}. {exercise.question}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      Your answer: {userAnswer || "No answer"}
                    </div>
                    <div className="text-sm text-gray-600">
                      Correct answer: {exercise.correctAnswer}
                    </div>
                    {exercise.explanation && (
                      <div className="mt-2 text-sm text-gray-700 bg-white p-3 rounded">
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
          onClick={handleComplete}
          className="mt-6 w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          Complete Lesson
        </button>
      </div>
    );
  }

  if (!currentExercise) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-4">No exercises available</h2>
        <p className="text-gray-600">Please contact support or try generating the course again.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Exercise {currentExerciseIndex + 1} of {exercises.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Lesson Info */}
      <div className="mb-6 space-y-4">
        <div className="p-4 bg-purple-50 rounded-lg">
          <h2 className="text-xl font-bold text-gray-900 mb-1">{lesson.title}</h2>
          <p className="text-sm text-gray-600">{lesson.summary}</p>
        </div>
        
        {lesson.explanation && (
          <div className="p-4 bg-white border-2 border-purple-100 rounded-lg">
            <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-600" />
              Explanation
            </h3>
            <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {lesson.explanation}
            </div>
          </div>
        )}

        {lesson.examples && lesson.examples.length > 0 && (
          <div className="p-4 bg-white border-2 border-purple-100 rounded-lg">
            <h3 className="font-bold text-gray-900 mb-2">Examples</h3>
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              {lesson.examples.map((example, index) => (
                <li key={index}>{example}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Exercise */}
      <div className="mb-6">
        <ExerciseRenderer
          exercise={currentExercise}
          userAnswer={userAnswers[currentExercise.id]}
          onAnswer={handleAnswer}
        />
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={() => setCurrentExerciseIndex((prev) => Math.max(0, prev - 1))}
          disabled={currentExerciseIndex === 0}
          className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <button
          onClick={handleNext}
          disabled={!userAnswers[currentExercise.id]}
          className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {currentExerciseIndex === exercises.length - 1 ? "Finish" : "Next"}
          <ArrowRight className="w-4 h-4" />
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
      return <ArrangeOrder exercise={exercise} userAnswer={userAnswer} onAnswer={onAnswer} />;
    case "fillBlank":
      return <FillBlank exercise={exercise} userAnswer={userAnswer} onAnswer={onAnswer} />;
    case "shortAnswer":
      return <TypeAnswer exercise={exercise} userAnswer={userAnswer} onAnswer={onAnswer} />;
    case "trueFalse":
      return <TrueFalse exercise={exercise} userAnswer={userAnswer} onAnswer={onAnswer} />;
    default:
      return <MultipleChoice exercise={exercise} userAnswer={userAnswer} onAnswer={onAnswer} />;
  }
}

function TrueFalse({ exercise, userAnswer, onAnswer }) {
  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">{exercise.question}</h3>
      <div className="flex gap-4">
        {["True", "False"].map((option) => (
          <button
            key={option}
            onClick={() => onAnswer(option)}
            className={`flex-1 p-4 text-center rounded-lg border-2 transition-all ${
              userAnswer === option
                ? "border-purple-500 bg-purple-50"
                : "border-gray-200 hover:border-purple-300"
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
  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">{exercise.question}</h3>
      <div className="space-y-3">
        {exercise.options.map((option, index) => (
          <button
            key={index}
            onClick={() => onAnswer(option)}
            className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
              userAnswer === option
                ? "border-purple-500 bg-purple-50"
                : "border-gray-200 hover:border-purple-300"
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
  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">{exercise.question}</h3>
      <input
        type="text"
        value={userAnswer || ""}
        onChange={(e) => onAnswer(e.target.value)}
        placeholder="Type your answer..."
        className="w-full p-4 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none"
      />
    </div>
  );
}

function TypeAnswer({ exercise, userAnswer, onAnswer }) {
  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">{exercise.question}</h3>
      <textarea
        value={userAnswer || ""}
        onChange={(e) => onAnswer(e.target.value)}
        placeholder="Type your answer..."
        rows={4}
        className="w-full p-4 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none resize-none"
      />
    </div>
  );
}

function MatchPairs({ exercise, userAnswer: _userAnswer, onAnswer }) {
  const pairs = exercise.pairs || [];
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

  const leftItems = pairs.filter(p => !matchedPairs.find(m => m.left.id === p.left.id)).map(p => p.left);
  const rightItems = pairs.filter(p => !matchedPairs.find(m => m.right.id === p.right.id)).map(p => p.right);

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">{exercise.question}</h3>
      <p className="text-sm text-gray-600 mb-4">Click an item on the left, then click its match on the right.</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          {leftItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleLeftClick(item)}
              className={`w-full p-3 text-left rounded-lg border-2 transition-all ${
                selectedLeft?.id === item.id
                  ? "border-purple-500 bg-purple-50"
                  : "border-gray-200 hover:border-purple-300"
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
              className="w-full p-3 text-left rounded-lg border-2 border-gray-200 hover:border-purple-300 transition-all"
            >
              {item.text}
            </button>
          ))}
        </div>
      </div>
      {matchedPairs.length > 0 && (
        <div className="mt-4 p-3 bg-green-50 rounded-lg">
          <p className="text-sm text-green-700">{matchedPairs.length} / {pairs.length} matched</p>
        </div>
      )}
    </div>
  );
}

function ArrangeOrder({ exercise, userAnswer: _userAnswer, onAnswer }) {
  const [items, setItems] = useState(exercise.items || []);

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
      <h3 className="text-lg font-medium text-gray-900 mb-4">{exercise.question}</h3>
      <p className="text-sm text-gray-600 mb-4">Drag to reorder the items in the correct sequence.</p>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="flex items-center gap-2 p-3 bg-white border-2 border-gray-200 rounded-lg"
          >
            <button
              onClick={() => moveItem(index, Math.max(0, index - 1))}
              disabled={index === 0}
              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
            >
              Up
            </button>
            <button
              onClick={() => moveItem(index, Math.min(items.length - 1, index + 1))}
              disabled={index === items.length - 1}
              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
            >
              Down
            </button>
            <span className="flex-1">{item.text}</span>
            <span className="text-gray-400 text-sm">{index + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineOrder({ exercise, userAnswer: _userAnswer, onAnswer }) {
  // ... logic
}
// Remove the unused TimelineOrder definition from imports if any, and it's defined below but not used in ExerciseRenderer

