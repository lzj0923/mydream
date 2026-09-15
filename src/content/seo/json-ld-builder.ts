import type { Article, Creator, DownloadSettings, Drama, HomePage, Site } from "@/content/types";
import { isPlaceholderMedia, isProductionReady } from "@/content/validation";

const absolute = (site: Site, path: string) => new URL(path, site.siteUrl).toString();
const clean = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const publicDrama = (drama: Drama) => isProductionReady(drama);
const publicArticle = (article: Article) => isProductionReady(article);
const publicCreator = (creator: Creator) => isProductionReady(creator);

export function buildHomeJsonLd(site: Site, home: HomePage, download: DownloadSettings): Record<string, unknown>[] {
  if (home.visibility !== "published") return [];
  const stores = [download.ios, download.android].filter((store) => store.availability === "available" && Boolean(store.url)).map((store) => store.url);
  const mobileApplication = stores.length ? [{ "@context": "https://schema.org", "@type": "MobileApplication", name: site.name, operatingSystem: "iOS, Android", downloadUrl: stores }] : [];
  return clean([{ "@context": "https://schema.org", "@type": "Organization", name: site.name, url: site.siteUrl }, { "@context": "https://schema.org", "@type": "WebSite", name: site.name, url: site.siteUrl, inLanguage: site.locale }, ...mobileApplication]);
}

export function buildDramaJsonLd(site: Site, drama: Drama): Record<string, unknown>[] {
  if (!publicDrama(drama)) return [];
  const work = { "@context": "https://schema.org", "@type": "CreativeWork", name: drama.title, description: drama.synopsis, url: absolute(site, `/drama/${drama.slug}`), genre: drama.categories, image: isPlaceholderMedia(drama.poster) ? undefined : absolute(site, drama.poster.src) };
  const video = drama.trailer && !isPlaceholderMedia(drama.trailer) ? [{ "@context": "https://schema.org", "@type": "VideoObject", name: drama.title, description: drama.synopsis, contentUrl: absolute(site, drama.trailer.src), thumbnailUrl: drama.trailer.poster ? absolute(site, drama.trailer.poster) : undefined }] : [];
  return clean([work, ...video]);
}

export function buildArticleJsonLd(
  site: Site,
  article: Article,
  { basePath = "/journal" }: { basePath?: "/journal" | "/news" } = {},
): Record<string, unknown>[] {
  if (!publicArticle(article)) return [];
  const articlePath = `${basePath}/${article.slug}`;
  const canonical = article.seo?.canonicalURL || absolute(site, article.seo?.canonicalPath || articlePath);
  const socialImage = article.seo?.ogImage || article.cover;
  return clean([{ "@context": "https://schema.org", "@type": "Article", headline: article.title, description: article.excerpt, datePublished: article.publishedAt, articleSection: article.category, keywords: article.seo?.keywords, author: { "@type": "Organization", name: article.author }, mainEntityOfPage: canonical, image: isPlaceholderMedia(socialImage) ? undefined : absolute(site, socialImage.src) }, { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "首頁", item: absolute(site, "/") }, { "@type": "ListItem", position: 2, name: basePath === "/news" ? "最新消息" : "內容誌", item: absolute(site, basePath) }, { "@type": "ListItem", position: 3, name: article.title, item: canonical }] }]);
}

export function buildCreatorJsonLd(site: Site, creator: Creator): Record<string, unknown>[] {
  if (!publicCreator(creator)) return [];
  const url = absolute(site, `/creator/${creator.slug}`);
  return clean([{ "@context": "https://schema.org", "@type": "ProfilePage", mainEntity: { "@type": "Person", name: creator.displayName, description: creator.bio, url, image: creator.avatar && !isPlaceholderMedia(creator.avatar) ? absolute(site, creator.avatar.src) : undefined } }]);
}
