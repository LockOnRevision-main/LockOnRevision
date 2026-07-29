function isAdminEmail(email) {
  const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const normalized = (email || "").toLowerCase();
  return normalized && adminEmails.includes(normalized);
}

export function canAccessAdmin(profile, email) {
  if (!profile) return false;
  if (profile.isAdmin === true) return true;
  if (profile.role === "admin") return true;
  return isAdminEmail(email || profile?.email);
}
