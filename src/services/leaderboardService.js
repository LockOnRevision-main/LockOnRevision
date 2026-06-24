import { fetchLeaderboard } from "./userService.js";

export async function getTopLeaderboardUsers() {
  return fetchLeaderboard();
}
