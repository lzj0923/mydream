import type { DownloadSettings } from "@/content/types";

export type DeepLinkTarget = { href: string; kind: "app" | "web" | "download" };

/** Uses only a configured HTTPS universal/app link; it never invents an application scheme. */
export function resolveDramaDeepLink(slug: string, settings: DownloadSettings): DeepLinkTarget {
  const webPath = `/drama/${encodeURIComponent(slug)}`;
  if (settings.deepLinkBase && settings.ios.availability === "available") {
    return { href: `${settings.deepLinkBase.replace(/\/$/, "")}${webPath}`, kind: "app" };
  }
  if (settings.ios.availability === "available" || settings.android.availability === "available") {
    return { href: "/download", kind: "download" };
  }
  return { href: webPath, kind: "web" };
}
