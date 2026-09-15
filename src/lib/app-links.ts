export const GOOGLE_PLAY_APP_URL = "https://play.google.com/store/apps/details?id=com.mydream.drama&hl=en";

export const AI_COMMUNITY_INVITE_URL = "https://line.me/ti/g2/vr7uMnk3IR79ezTnclkVbf84cQsGgoNlngsLyQ?utm_source=invitation&utm_medium=link_copy&utm_campaign=default";

export function aiCommunityInviteHref(value: unknown) {
  const href = typeof value === "string" ? value.trim() : "";
  return !href || href === "/download" ? AI_COMMUNITY_INVITE_URL : href;
}
