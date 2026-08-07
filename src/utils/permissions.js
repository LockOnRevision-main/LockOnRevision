export function canAccessAdmin(profile) {
  if (!profile) return false;
  if (profile.isAdmin === true) return true;
  if (profile.role === "admin") return true;
  return false;
}
