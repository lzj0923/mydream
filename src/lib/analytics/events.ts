export const analyticsEvents = {
  pageView: "page_view",
  heroDownloadClick: "hero_download_click",
  navbarDownloadClick: "navbar_download_click",
  dramaCardClick: "drama_card_click",
  dramaPreviewClick: "drama_preview_click",
  creatorCtaClick: "creator_cta_click",
  articleClick: "article_click",
  appStoreClick: "app_store_click",
  googlePlayClick: "google_play_click",
  qrView: "qr_view",
  businessFormStart: "business_form_start",
  businessFormSubmit: "business_form_submit",
  businessFormSuccess: "business_form_success",
  businessFormError: "business_form_error",
} as const;

export type AnalyticsEvent = keyof typeof analyticsEvents;
type AnalyticsValue = string | number | boolean;
const forbiddenKeys = /email|phone|name|message|company|consent/i;

export function sanitizeAnalyticsParameters(parameters: Record<string, AnalyticsValue> = {}): Record<string, AnalyticsValue> {
  return Object.fromEntries(Object.entries(parameters).filter(([key]) => !forbiddenKeys.test(key)));
}

export function hasAnalyticsConsent(): boolean {
  return typeof window !== "undefined" && window.localStorage.getItem("mydream-consent") === "analytics";
}

/** Analytics is opt-in. It never sends form content or other PII. */
export function track(event: AnalyticsEvent, parameters: Record<string, AnalyticsValue> = {}): void {
  if (process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== "true" || !hasAnalyticsConsent()) return;
  const payload = sanitizeAnalyticsParameters(parameters);
  const name = analyticsEvents[event];
  const windowWithAnalytics = window as Window & { gtag?: (...args: unknown[]) => void; dataLayer?: unknown[] };
  windowWithAnalytics.gtag?.("event", name, payload);
  windowWithAnalytics.dataLayer?.push({ event: name, ...payload });
}
