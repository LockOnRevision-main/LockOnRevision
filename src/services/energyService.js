const BASE_RANGES = {
  lesson: { min: 1, max: 2 },
  level: { min: 3, max: 4 },
  unit: { min: 5, max: 6 },
  term: { min: 10, max: 20 },
};

const DIFFICULTY_FACTORS = {
  easy: 0.3,
  medium: 0.55,
  hard: 0.8,
};

const GRADE_PROFILES = {
  "Grade 1": { level: 1, weight: 0.4 },
  "Grade 2": { level: 2, weight: 0.45 },
  "Grade 3": { level: 3, weight: 0.5 },
  "Grade 4": { level: 4, weight: 0.6 },
  "Grade 5": { level: 5, weight: 0.7 },
  "Grade 6": { level: 6, weight: 0.8 },
  "Grade 7": { level: 7, weight: 0.9 },
  "Grade 8": { level: 8, weight: 1.0 },
  "Grade 9": { level: 9, weight: 1.1 },
  "Grade 10": { level: 10, weight: 1.2 },
  "Grade 11": { level: 11, weight: 1.35 },
  "Grade 12": { level: 12, weight: 1.5 },
};

const CURRICULUM_PROFILES = {
  IGCSE: { weight: 1.0, difficultyOffset: 0 },
  "A-Level": { weight: 1.3, difficultyOffset: 0.15 },
  GCSE: { weight: 1.0, difficultyOffset: 0 },
  IB: { weight: 1.2, difficultyOffset: 0.1 },
  AP: { weight: 1.1, difficultyOffset: 0.05 },
  Cambridge: { weight: 1.0, difficultyOffset: 0 },
  National: { weight: 0.9, difficultyOffset: -0.05 },
  CBSE: { weight: 0.95, difficultyOffset: -0.02 },
  ICSE: { weight: 0.9, difficultyOffset: -0.05 },
  "South African CAPS": { weight: 0.85, difficultyOffset: -0.08 },
};

const ACHIEVEMENT_BONUSES = [
  { id: "fast-learner", amount: 0.3 },
  { id: "no-hints", amount: 0.3 },
  { id: "first-try", amount: 0.2 },
];

export function getGradeProfile(grade) {
  return GRADE_PROFILES[grade] || { level: 0, weight: 1.0 };
}

export function getCurriculumProfile(curriculum) {
  return CURRICULUM_PROFILES[curriculum] || { weight: 1.0, difficultyOffset: 0 };
}

export function getGradeWeight(grade) {
  return getGradeProfile(grade).weight;
}

export function getGradeMultiplier(grade) {
  return getGradeProfile(grade).weight;
}

export function getCurriculumWeight(curriculum) {
  return getCurriculumProfile(curriculum).weight;
}

export function getCurriculumMultiplier(curriculum) {
  return getCurriculumProfile(curriculum).weight;
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
  achievements = [],
}) {
  const range = BASE_RANGES[type] || BASE_RANGES.lesson;
  const difficultyFactor = DIFFICULTY_FACTORS[difficulty] || 0.55;
  const gradeProfile = getGradeProfile(grade);
  const curriculumProfile = getCurriculumProfile(curriculum);

  const gradeScaledDifficulty = difficultyFactor * (0.4 + gradeProfile.weight * 0.6);

  const curriculumDifficulty = 1 + curriculumProfile.difficultyOffset;

  const topicScaler = topicDifficulty !== undefined
    ? 0.8 + Math.min(topicDifficulty, 1) * 0.4
    : 1.0;

  const accuracyFactor = accuracy !== undefined
    ? 0.5 + (Math.min(100, Math.max(0, accuracy)) / 100) * 0.5
    : 1.0;

  const perfectBonus = perfect ? 1.25 : 1.0;

  let challenge = gradeScaledDifficulty * curriculumDifficulty * topicScaler * accuracyFactor * perfectBonus;
  challenge = Math.max(0, Math.min(1, challenge * 0.6 + 0.2));

  let energy = range.min + (range.max - range.min) * challenge;

  if (perfect) energy += 0.5;
  if (accuracy !== undefined && accuracy >= 100) energy += 0.5;

  ACHIEVEMENT_BONUSES.forEach((bonus) => {
    if (achievements.includes(bonus.id)) energy += bonus.amount;
  });

  return Math.max(0.5, Math.round(energy * 10) / 10);
}

export function calculateLessonReward(lesson = {}, profile = {}) {
  return calculateEnergyReward({
    type: "lesson",
    difficulty: lesson.difficulty || "medium",
    accuracy: lesson.accuracy,
    perfect: lesson.perfect || false,
    grade: profile?.grade,
    curriculum: profile?.curriculum,
    subject: lesson.subjectName,
    topicDifficulty: lesson.topicDifficulty,
    achievements: lesson.achievements || [],
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