import { describe, it } from "node:test";
import assert from "node:assert/strict";

/**
 * Regression test: Lesson progression — completing a lesson advances to the next lesson.
 *
 * Root cause: ForgeLessonPage persisted completion via completeLesson() but never
 * navigated to the next lesson. Fix: after a successful (non-duplicate) completion,
 * select the next lesson by order within the same subject and navigate to it;
 * if none remains, return to the subject page.
 *
 * This test covers the next-lesson selection logic in isolation.
 */

function selectNextLesson(lessons, currentLessonId) {
  const sorted = [...lessons].sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));
  const currentIdx = sorted.findIndex((l) => l.id === currentLessonId);
  if (currentIdx === -1) return null;
  return sorted[currentIdx + 1] || null; // null = no next lesson -> return to subject
}

describe("Forge lesson progression regression", () => {
  it("advances to the next lesson by order within the same subject", () => {
    const lessons = [
      { id: "l1", title: "First", order: 0, subjectId: "s1" },
      { id: "l2", title: "Second", order: 1, subjectId: "s1" },
      { id: "l3", title: "Third", order: 2, subjectId: "s1" },
    ];
    const next = selectNextLesson(lessons, "l1");
    assert.equal(next.id, "l2");
    assert.equal(next.title, "Second");
  });

  it("returns null when the current lesson is the last one (resume to subject page)", () => {
    const lessons = [
      { id: "l1", title: "First", order: 0, subjectId: "s1" },
      { id: "l2", title: "Second", order: 1, subjectId: "s1" },
    ];
    const next = selectNextLesson(lessons, "l2");
    assert.equal(next, null);
  });

  it("sorts lessons by order regardless of input order", () => {
    const lessons = [
      { id: "l3", title: "Third", order: 2, subjectId: "s1" },
      { id: "l1", title: "First", order: 0, subjectId: "s1" },
      { id: "l2", title: "Second", order: 1, subjectId: "s1" },
    ];
    const next = selectNextLesson(lessons, "l1");
    assert.equal(next.id, "l2");
  });

  it("returns null for an unknown lesson id", () => {
    const lessons = [
      { id: "l1", title: "First", order: 0, subjectId: "s1" },
    ];
    const next = selectNextLesson(lessons, "l999");
    assert.equal(next, null);
  });

  it("handles empty lesson list", () => {
    const next = selectNextLesson([], "l1");
    assert.equal(next, null);
  });

  it("uses default order of 0 when order is missing", () => {
    const lessons = [
      { id: "l1", title: "First", subjectId: "s1" },
      { id: "l2", title: "Second", order: 5, subjectId: "s1" },
    ];
    const next = selectNextLesson(lessons, "l1");
    assert.equal(next.id, "l2");
  });
});
