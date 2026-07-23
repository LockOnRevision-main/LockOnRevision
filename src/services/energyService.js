const DIFFICULTY_WEIGHTS = {
  easy: 0.7,
  medium: 1.0,
  hard: 1.3,
};

const BASE_ENERGY = {
  lesson: 1.5,
  level: 3.5,
  unit: 5.5,
  term: 15,
};

const GRADE_MULTIPLIERS = {
  "Grade 1": 0.4,
  "Grade 2": 0.45,
  "Grade 3": 0.5,
  "Grade 4": 0.6,
  "Grade 5": 0.7,
  "Grade 6": 0.8,
  "Grade 7": 0.9,
  "Grade 8": 1.0,
  "Grade 9": 1.1,
  "Grade 10": 1.2,
  "Grade 11": 1.35,
  "Grade 12": 1.5,
};

const CURRICULUM_MULTIPLIERS = {
  IGCSE: 1.0,
  "A-Level": 1.3,
  GCSE: 1.0,
  IB: 1.2,
  AP: 1.1,
  Cambridge: 1.0,
  National: 0.9,
  CBSE: 0.95,
  ICSE: 0.9,
  "South African CAPS": 0.85,
};

export function getGradeMultiplier(grade) {
  return GRADE_MULTIPLIERS[grade] || 1.0;
}

export function getCurriculumMultiplier(curriculum) {
  return CURRICULUM_MULTIPLIERS[curriculum] || 1.0;
}

export function calculateEnergyReward({
  type = "lesson",
  difficulty = "medium",
  accuracy,
  perfect = false,
  grade,
  curriculum,
  subject: _subject,
  topicDifficulty,
}) {
  const base = BASE_ENERGY[type] || 1.5;
  const difficultyWeight = DIFFICULTY_WEIGHTS[difficulty] || 1.0;
  const gradeMult = getGradeMultiplier(grade);
  const curriculumMult = getCurriculumMultiplier(curriculum);

  const accuracyMult =
    accuracy !== undefined
      ? 0.5 + (Math.min(100, Math.max(0, accuracy)) / 100) * 0.5
      : 1.0;

  const topicWeight = topicDifficulty !== undefined
    ? 0.8 + topicDifficulty * 0.4
    : 1.0;

  const perfectBonus = perfect ? 1.25 : 1.0;

  let energy =
    base *
    difficultyWeight *
    gradeMult *
    curriculumMult *
    accuracyMult *
    topicWeight *
    perfectBonus;

  if (perfect) energy += 0.5;

  if (accuracy !== undefined && accuracy >= 100) energy += 0.5;

  return Math.max(0.5, Math.round(energy * 10) / 10);
}

export function calculateLessonReward(lesson, profile) {
  const difficulty = lesson.difficulty || "medium";
  const accuracy = lesson.accuracy;
  const perfect = lesson.perfect || false;
  const grade = profile?.grade;
  const curriculum = profile?.curriculum;
  const subject = lesson.subjectName;
  const topicDifficulty = lesson.topicDifficulty;

  return calculateEnergyReward({
    type: "lesson",
    difficulty,
    accuracy,
    perfect,
    grade,
    curriculum,
    subject,
    topicDifficulty,
  });
}

export function calculateLevelReward(profile) {
  return calculateEnergyReward({
    type: "level",
    difficulty: "medium",
    grade: profile?.grade,
    curriculum: profile?.curriculum,
  });
}

export function calculateUnitReward(profile) {
  return calculateEnergyReward({
    type: "unit",
    difficulty: "medium",
    grade: profile?.grade,
    curriculum: profile?.curriculum,
  });
}

export function calculateTermReward(profile) {
  return calculateEnergyReward({
    type: "term",
    difficulty: "hard",
    grade: profile?.grade,
    curriculum: profile?.curriculum,
  });
}

export function completedToday(userProfile) {
  if (!userProfile?.activity) return false;
  const today = new Date().toISOString().split("T")[0];
  return (userProfile.activity[today] || 0) > 0;
}

export function getStreakBonus(streak) {
  if (streak >= 30) return 1.15;
  if (streak >= 14) return 1.1;
  if (streak >= 7) return 1.05;
  return 1.0;
}

export function calculateSpendableEnergy(earned, spent = 0) {
  return Math.max(0, Math.round((earned - spent) * 10) / 10);
}

export const ENERGY_EVENTS = {
  LESSON_COMPLETED: "energy:lesson-completed",
  LEVEL_COMPLETED: "energy:level-completed",
  UNIT_COMPLETED: "energy:unit-completed",
  TERM_COMPLETED: "energy:term-completed",
  ENERGY_SPENT: "energy:spent",
  DAILY_REWARD: "energy:daily-reward",
  CHALLENGE_REWARD: "energy:challenge-reward",
  EVENT_REWARD: "energy:event-reward",
  PREMIUM_REWARD: "energy:premium-reward",
};

export function emitEnergyEvent(eventType, detail) {
  window.dispatchEvent(new CustomEvent(eventType, { detail }));
}

export function onEnergyEvent(eventType, callback) {
  const handler = (e) => callback(e.detail);
  window.addEventListener(eventType, handler);
  return () => window.removeEventListener(eventType, handler);
}
