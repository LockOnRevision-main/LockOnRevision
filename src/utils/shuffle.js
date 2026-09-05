// Fisher-Yates true randomization, not alternating patterns
export function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickRandomVariant(exercise) {
  const variants = Array.isArray(exercise?.variants) && exercise.variants.length ? exercise.variants : null;
  if (!variants) return exercise;
  const idx = Math.floor(Math.random() * variants.length);
  const v = variants[idx];
  // Merge variant fields over base, keep id/type stable for grading consistency record
  return {
    ...exercise,
    ...v,
    id: exercise.id,
    type: exercise.type,
    _variantIndex: idx,
    _variantId: v.id || `v-${idx}`,
  };
}

// Select presentation exercise – variant + shuffled ordering handled by components
export function getPresentationExercise(exercise) {
  return pickRandomVariant(exercise);
}
