/**
 * Expert Messaging helpers (shared). Tag syntax is the existing @role form
 * used by the assistant/panel: @teacher, @coordinator, @principal.
 * Ambiguous or unknown tags must never silently pick a different person.
 */

export const STAFF_ROLES = ["school_admin", "coordinator", "teacher"];

/** @principal maps to the school_admin membership role. */
export const TAG_TO_ROLE = {
  teacher: "teacher",
  coordinator: "coordinator",
  principal: "school_admin",
};

export const EXPERT_TAG_RE = /(?:^|\s)@(teacher|principal|coordinator)\b/gi;

export function parseExpertTags(text) {
  if (typeof text !== "string" || !text.trim()) return [];
  const found = [];
  const re = new RegExp(EXPERT_TAG_RE.source, "gi");
  let m;
  while ((m = re.exec(text))) {
    const tag = m[1].toLowerCase();
    if (!found.includes(tag)) found.push(tag);
  }
  return found;
}

export function singleExpertTag(text) {
  const tags = parseExpertTags(text);
  if (tags.length === 0) return null;
  if (tags.length > 1) {
    throw Object.assign(
      new Error("Ambiguous recipient tag. Use a single @teacher, @coordinator, or @principal."),
      { status: 409, code: "ambiguous_tag" },
    );
  }
  return tags[0];
}

export function roleForTag(tag) {
  return TAG_TO_ROLE[tag] || null;
}

export function conversationId(schoolId, uidA, uidB) {
  const [x, y] = [String(uidA), String(uidB)].sort();
  return `${String(schoolId)}__${x}__${y}`.slice(0, 700);
}

export function isStaffRole(role) {
  return STAFF_ROLES.includes(role);
}

/**
 * Choose exactly one staff uid from candidates.
 * Never falls back to a different person when the match is missing or ambiguous.
 */
export function pickUniqueUid(candidates, { noneMessage, manyMessage }) {
  const ids = [...new Set((candidates || []).filter((id) => typeof id === "string" && id.trim()))];
  if (ids.length === 0) {
    throw Object.assign(new Error(noneMessage || "No eligible recipient found."), {
      status: 404,
      code: "recipient_unavailable",
    });
  }
  if (ids.length > 1) {
    throw Object.assign(new Error(manyMessage || "Multiple eligible recipients. Ask a specific person."), {
      status: 409,
      code: "ambiguous_recipient",
    });
  }
  return ids[0];
}
