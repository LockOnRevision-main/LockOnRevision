import { onLessonCompleted } from "./forgeEvents.js";
import { updateTimetable, regenerateRemaining, markSessionCompleted } from "./timetableService.js";

export function setupTimetableIntegration(uid, timetableId, timetableRef) {
  // When a Forge lesson is completed, auto-update the timetable
  const unsubLesson = onLessonCompleted(async (detail) => {
    if (!timetableId || !timetableRef.current) return;

    const lessonSubject = detail.subjectName || "";
    const now = new Date();
    const todayDay = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][(now.getDay() + 6) % 7];

    const t = timetableRef.current;
    let updated = false;

    // Find the first uncompleted slot matching the lesson's subject for today
    for (const week of t.weeks) {
      const slots = week.days?.[todayDay] || [];
      const match = slots.find((s) => s.subject === lessonSubject && !s.completed && !s.skipped);
      if (match) {
        updated = true;
        break;
      }
    }

    if (updated) {
      // Auto-mark a matching session as completed
      let modified = false;
      for (const week of t.weeks) {
        const slots = week.days?.[todayDay] || [];
        for (const slot of slots) {
          if (slot.subject === lessonSubject && !slot.completed && !slot.skipped && !modified) {
            const updatedT = markSessionCompleted(t, t.weeks.indexOf(week), todayDay, slot.id);
            Object.assign(t, updatedT);
            modified = true;

            // Regenerate remaining schedule
            const regenerated = regenerateRemaining(t);
            Object.assign(t, regenerated);

            // Persist
            await updateTimetable(uid, timetableId, { weeks: t.weeks, updatedAt: new Date().toISOString() });
            break;
          }
        }
        if (modified) break;
      }
    }
  });

  return () => {
    unsubLesson();
  };
}
