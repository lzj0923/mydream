type RuntimeEnvironment = "development" | "production" | string | undefined;

const analyticsSources = ["https://www.googletagmanager.com", "https://www.google-analytics.com"];
const accountScriptSources = ["https://accounts.google.com", "https://connect.facebook.net", "https://appleid.cdn-apple.com"];
const accountConnectSources = ["https://accounts.google.com", "https://oauth2.googleapis.com", "https://graph.facebook.com", "https://appleid.apple.com"];
const accountFrameSources = ["https://accounts.google.com", "https://www.facebook.com", "https://appleid.apple.com"];

/**
 * Keep the development exception local to development: Next's dev runtime
 * needs eval-based source mapping, while production must remain strict.
 */
export function buildContentSecurityPolicy(
  environment: RuntimeEnvironment = process.env.NODE_ENV,
  cmsApiUrl: string | undefined = process.env.CMS_API_URL,
  siteUrl: string | undefined = process.env.NEXT_PUBLIC_SITE_URL,
): string {
  const scriptSources = ["'self'", "'unsafe-inline'", ...(environment === "development" ? ["'unsafe-eval'"] : []), ...analyticsSources, ...accountScriptSources];
  const cmsOrigin = (() => {
    if (!cmsApiUrl) return null;
    try { return new URL(cmsApiUrl).origin; } catch { return null; }
  })();
  const connectSources = ["'self'", "https://*.aliyuncs.com", ...analyticsSources, ...accountConnectSources, ...(cmsOrigin ? [cmsOrigin] : [])];
  const managedMediaSources = ["'self'", "data:", "blob:", "https:", ...(cmsOrigin ? [cmsOrigin] : [])];
  const usesHttps = siteUrl?.startsWith("https://") ?? false;

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    `script-src ${scriptSources.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src ${managedMediaSources.join(" ")}`,
    `media-src ${managedMediaSources.filter((source) => source !== "data:").join(" ")}`,
    `connect-src ${connectSources.join(" ")}`,
    `frame-src 'self' ${accountFrameSources.join(" ")}`,
    "frame-ancestors 'self'",
    "form-action 'self' https://core.newebpay.com https://ccore.newebpay.com",
    ...(environment === "production" && usesHttps ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}
