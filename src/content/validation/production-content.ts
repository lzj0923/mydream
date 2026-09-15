import type { ContentStatus, DownloadSettings, MediaAsset } from "@/content/types";

type Publishable = { publicationStatus?: ContentStatus; contentStatus?: ContentStatus; [key: string]: unknown };
const placeholderPattern = /(placeholder|lorem ipsum|探索示意|示意畫面|coming soon|mock data|api 尚未完成|cms 尚未串接)/i;
const statusOf = (value: Publishable) => value.publicationStatus || value.contentStatus || "draft";
export function isPlaceholderMedia(media: MediaAsset | undefined): boolean { return Boolean(media && (media.isPlaceholder || placeholderPattern.test(`${media.src} ${media.alt}`) || /^(linear-gradient|radial-gradient)/.test(media.src))); }
function containsPlaceholder(value: unknown): boolean {
  if (typeof value === "string") return placeholderPattern.test(value) || value === "#";
  if (Array.isArray(value)) return value.some(containsPlaceholder);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (record.isPlaceholder === true) return true;
    return Object.values(record).some(containsPlaceholder);
  }
  return false;
}
export function productionIssues(value: Publishable): string[] { const issues: string[] = []; if (statusOf(value) !== "published") issues.push("Only published content can be served in production."); if (containsPlaceholder(value)) issues.push("Content contains placeholder copy, media, or a # URL."); return issues; }
export function isProductionReady<T extends Publishable>(value: T): boolean { return productionIssues(value).length === 0; }
export function filterProductionContent<T extends Publishable>(items: T[], production: boolean): T[] { return production ? items.filter(isProductionReady) : items.filter((item) => !["archived", "placeholder"].includes(statusOf(item))); }
export function findDuplicateSlugs(items: Array<{ slug: string }>): string[] { const seen = new Set<string>(); const duplicates = new Set<string>(); for (const item of items) { if (seen.has(item.slug)) duplicates.add(item.slug); seen.add(item.slug); } return [...duplicates]; }
export function sanitizeDownloadSettings(settings: DownloadSettings): DownloadSettings {
  const store = (value: DownloadSettings["ios"]) => value.availability === "available" && value.url && value.url !== "#"
    ? value
    : { availability: value.availability === "temporarily-unavailable" ? "temporarily-unavailable" as const : "coming-soon" as const };
  const qrCode = settings.qrCodeStatus === "available" && !isPlaceholderMedia(settings.qrCode) ? settings.qrCode : undefined;
  const deepLinkBase = settings.deepLinkStatus === "available" ? settings.deepLinkBase : undefined;
  const safeSettings = { ...settings };
  delete safeSettings.qrCode;
  delete safeSettings.deepLinkBase;
  return {
    ...safeSettings,
    ios: store(settings.ios),
    googlePlay: store(settings.googlePlay),
    android: store(settings.android),
    ...(qrCode ? { qrCode } : {}),
    ...(deepLinkBase ? { deepLinkBase } : {}),
  };
}
