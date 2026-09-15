import { navigationHeroProps } from "./navigation-hero";
import { normalizeAppVideoContent } from "./app-video-content";

export type CmsNavigationItem = {
  id: string;
  parentId?: string;
  label: string;
  linkType: "INTERNAL" | "EXTERNAL" | "ANCHOR";
  linkValue: string;
  target: "_self" | "_blank";
  order: number;
  children: CmsNavigationItem[];
};

export type CmsBlock = {
  id: string;
  type: string;
  schemaVersion: number;
  zone: string;
  order: number;
  props: Record<string, unknown>;
  style: Record<string, unknown>;
};

export type CmsPage = {
  id: string;
  path: string;
  key: string;
  locale: string;
  title: string;
  seo: Record<string, unknown>;
  blocks: CmsBlock[];
};

export type CmsContent = {
  id: string;
  type: string;
  slug: string;
  locale: string;
  title: string;
  summary?: string;
  coverUrl?: string;
  data: Record<string, unknown>;
  featured: boolean;
  sortWeight: number;
};

export type CmsSiteShell = {
  siteKey: string;
  name: string;
  locale: string;
  releaseId: string;
  releaseNo: number;
  config: Record<string, unknown>;
  theme: Record<string, unknown>;
  navigations: Record<string, { key: string; name: string; items: CmsNavigationItem[] }>;
};

const apiBase = process.env.CMS_API_URL?.replace(/\/$/, "");
const siteKey = process.env.CMS_SITE_KEY ?? "mydream";
export const CMS_REQUEST_TIMEOUT_MS = 3000;
export const cmsRequestOptions = {
  cache: "no-store",
  headers: { Accept: "application/json" },
} as const;

async function cmsFetch<T>(path: string): Promise<T | null> {
  if (!apiBase) return null;
  try {
    const response = await fetch(`${apiBase}${path}`, {
      ...cmsRequestOptions,
      signal: AbortSignal.timeout(CMS_REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export function isJavaCmsEnabled() {
  return Boolean(apiBase);
}

export function getManagedShell() {
  return cmsFetch<CmsSiteShell>(`/public-api/v1/sites/${encodeURIComponent(siteKey)}/shell`);
}

export function getManagedPage(path: string, locale?: string) {
  const query = new URLSearchParams({ path });
  if (locale) query.set("locale", locale);
  return cmsFetch<CmsPage>(`/public-api/v1/sites/${encodeURIComponent(siteKey)}/pages?${query}`).then(page => page ? { ...page, blocks: page.blocks.map(block => block.zone === "hero" ? { ...block, props: navigationHeroProps(path, block.props) } : block) } : null);
}

export function getManagedContent(type: string, locale?: string, limit = 100, parentSlug?: string) {
  const query = new URLSearchParams({ limit: String(limit) });
  if (locale) query.set("locale", locale);
  if (parentSlug) query.set("parentSlug", parentSlug);
  return cmsFetch<CmsContent[]>(`/public-api/v1/sites/${encodeURIComponent(siteKey)}/content/${encodeURIComponent(type)}?${query}`)
    .then((items) => items?.map(normalizeAppVideoContent) ?? null);
}

export function navigationHref(item: CmsNavigationItem) {
  const value = item.linkValue.trim();
  if (/^(?:javascript|data):/i.test(value) || value.includes("\\")) return "/";
  if (item.linkType === "INTERNAL") return value.startsWith("/") ? value : "/";
  if (item.linkType === "ANCHOR") return value.startsWith("#") ? value : `#${value}`;
  return /^https?:\/\//i.test(value) ? value : "/";
}
