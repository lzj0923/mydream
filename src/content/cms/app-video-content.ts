import type { CmsContent } from "./java-cms-client";

/** App uploads may not have the optional website fields populated yet. */
export function normalizeAppVideoContent(item: CmsContent): CmsContent {
  if (item.type !== "original-video" || item.data.source !== "app") return item;
  const appId = Number(item.data.appId);
  if (!Number.isSafeInteger(appId) || appId <= 0) return item;
  const slug = item.slug?.trim() || `app-video-${appId}`;
  const href = typeof item.data.href === "string" && item.data.href.trim()
    ? item.data.href : `/universe/videos/${slug}`;
  return { ...item, id: item.id || `app-video-${appId}`, slug, data: { ...item.data, href } };
}
