import { defaultAvatars } from "../components/Profile/defaultAvatars";
import { getProfileIconById } from "../components/Profile/profileIcons";

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getDefaultAvatarIndex(uid) {
  return hashCode(uid) % defaultAvatars.length;
}

export function getDefaultAvatar(uid) {
  const index = getDefaultAvatarIndex(uid);
  return { ...defaultAvatars[index], index };
}

export function hasCustomAvatar(profile) {
  return profile?.hasCustomAvatar === true;
}

export function hasSelectedIcon(profile) {
  return !!profile?.avatarIcon;
}

export function getLeaderAvatar(profile, uid) {
  if (hasCustomAvatar(profile) && profile?.avatarUrl) {
    return { type: "image", src: profile.avatarUrl };
  }
  if (hasSelectedIcon(profile)) {
    const icon = getProfileIconById(profile.avatarIcon);
    return { type: "icon", svg: icon?.svg || null, iconId: profile.avatarIcon };
  }
  const defaultAvatar = getDefaultAvatar(uid || profile?.id || "anonymous");
  return { type: "default", svg: defaultAvatar.svg, category: defaultAvatar.category };
}
