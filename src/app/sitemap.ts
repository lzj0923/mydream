import type { MetadataRoute } from "next";
import { getArticles, getDramas, getSiteSettings } from "@/content/queries";
import { prototypeCharacters, prototypeIps, prototypeWorks } from "@/data/jyg-prototype";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [site, dramas, articles] = await Promise.all([getSiteSettings(), getDramas(), getArticles()]);
  const routes = [
    "", "/universe", "/ips", "/characters", "/works", "/works/comics",
    "/works/comic-drama", "/works/animation", "/works/music", "/creator", "/tasks",
    "/news", "/business", "/about", "/creator-id", "/creator-id/protection", "/download", "/privacy", "/terms",
  ];
  const publishedDramas = dramas.filter((drama) => drama.publicationStatus === "published");
  const publishedArticles = articles.filter((article) => article.publicationStatus === "published");
  return [
    ...routes.map((path) => ({ url: new URL(path || "/", site.siteUrl).toString(), lastModified: new Date(), changeFrequency: "weekly" as const, priority: path === "" ? 1 : 0.7 })),
    ...prototypeIps.map((item) => ({ url: new URL(`/ips/${item.slug}`, site.siteUrl).toString(), lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.8 })),
    ...prototypeCharacters.map((item) => ({ url: new URL(`/characters/${item.slug}`, site.siteUrl).toString(), lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.8 })),
    ...prototypeWorks.map((item) => ({ url: new URL(`/works/${item.slug}`, site.siteUrl).toString(), lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.8 })),
    ...publishedDramas.map((drama) => ({ url: new URL(`/drama/${drama.slug}`, site.siteUrl).toString(), lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.8 })),
    ...publishedArticles.map((article) => ({ url: new URL(`/news/${article.slug}`, site.siteUrl).toString(), lastModified: new Date(article.publishedAt), changeFrequency: "monthly" as const, priority: 0.7 })),
  ];
}
