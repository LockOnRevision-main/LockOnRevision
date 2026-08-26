/**
 * Calendar sync hook for LockOnRevision.
 * DISABLED — returns no-op interfaces. Activate in a future prompt.
 *
 * Reusable interface:
 *   enabled         — whether calendar sync is active
 *   synced          — whether sync is currently established
 *   provider        — "google" | "apple" | null
 *   events          — list of synced timetable events
 *   sync(provider)  — initiate sync with given provider
 *   unsync()        — tear down sync connection
 *   exportEvents()  — export current timetable as calendar events
 */
export function useCalendarSync() {
  return {
    enabled: false,
    synced: false,
    provider: null,
    events: [],
    async sync(_provider) {
      console.warn("[useCalendarSync] Not yet implemented.");
    },
    async unsync() {
      console.warn("[useCalendarSync] Not yet implemented.");
    },
    exportEvents() {
      console.warn("[useCalendarSync] Not yet implemented.");
      return [];
    },
  };
}
