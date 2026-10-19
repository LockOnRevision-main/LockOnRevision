/**
 * Reminder engine hook for LockOnRevision.
 * DISABLED — returns no-op interfaces. Activate in a future prompt.
 *
 * Reusable interface:
 *   enabled               — whether reminders are active
 *   reminders             — list of active reminders
 *   add(reminder)         — schedule a new reminder
 *   remove(id)            — cancel a reminder by id
 *   snooze(id, minutes)   — postpone a reminder
 *   acknowledge(id)       — mark a reminder as seen
 */
export function useReminderEngine() {
  return {
    enabled: false,
    reminders: [],
    add(_reminder) {},
    remove(_id) {},
    snooze(_id, _minutes) {},
    acknowledge(_id) {},
  };
}
