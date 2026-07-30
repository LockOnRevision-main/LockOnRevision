/**
 * Push notification hook for LockOnRevision.
 * DISABLED — returns no-op interfaces. Activate in a future prompt.
 *
 * Reusable interface:
 *   enabled       — whether notifications are active
 *   supported     — whether the browser supports the Notification API
 *   permission    — current permission state ("granted" | "denied" | "default")
 *   subscribe()   — request permission and register push subscription
 *   unsubscribe() — revoke permission and remove subscription
 */
export function usePushNotifications() {
  return {
    enabled: false,
    supported: false,
    permission: "denied",
    async subscribe() {
      console.warn("[usePushNotifications] Not yet implemented.");
    },
    async unsubscribe() {
      console.warn("[usePushNotifications] Not yet implemented.");
    },
  };
}
