const attempts = new Map<string, { count: number; resetAt: number }>();

export function isAllowedOrigin(request: Request, siteUrl = process.env.NEXT_PUBLIC_SITE_URL, environment = process.env.NODE_ENV, localPreview = process.env.CMS_LOCAL_PREVIEW === "true"): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const allowed = new Set<string>();
  try { allowed.add(new URL(request.url).origin); } catch { /* invalid request URL */ }
  try { if (siteUrl) allowed.add(new URL(siteUrl).origin); } catch { /* invalid configured URL */ }
  if (environment === "development" || localPreview) {
    try {
      const target = new URL(request.url), source = new URL(origin);
      const loopback = new Set(["localhost", "127.0.0.1", "[::1]"]);
      if (loopback.has(target.hostname) && loopback.has(source.hostname) && target.port === source.port && target.protocol === source.protocol) return true;
    } catch { /* malformed origins remain denied */ }
  }
  return allowed.has(origin);
}

export function clientAddress(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || "unknown";
}

export function consumeLoginAttempt(key: string, now = Date.now(), limit = 12, windowMs = 10 * 60_000): boolean {
  if (attempts.size > 5_000) {
    for (const [entryKey, entry] of attempts) if (entry.resetAt <= now) attempts.delete(entryKey);
  }
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

export function secureSessionCookie(environment = process.env.NODE_ENV, localPreview = process.env.CMS_LOCAL_PREVIEW === "true"): boolean {
  return environment === "production" && !localPreview;
}
