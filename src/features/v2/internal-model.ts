import type { Article, DownloadSettings, Drama } from "@/content/types";
import { isPlaceholderMedia } from "@/content/validation";

export const v2InternalRoutes = [
  "/explore",
  "/creator",
  "/journal",
  "/about",
  "/download",
  "/business",
  "/privacy",
  "/terms",
] as const;

export function publishedDramas(dramas: Drama[]): Drama[] {
  return dramas
    .filter((drama) => drama.publicationStatus === "published" && !isPlaceholderMedia(drama.poster))
    .sort((left, right) => Number(right.featured) - Number(left.featured));
}
export function publishedArticles(articles: Article[]): Article[] {
  return articles
    .filter((article) => article.publicationStatus === "published" && !isPlaceholderMedia(article.cover))
    .sort((left, right) => {
      const featured = Number(right.featured) - Number(left.featured);
      return featured || right.publishedAt.localeCompare(left.publishedAt);
    });
}

export function isPublicDrama(drama: Drama): boolean {
  return drama.publicationStatus === "published" && !isPlaceholderMedia(drama.poster);
}

export function isPublicArticle(article: Article): boolean {
  return article.publicationStatus === "published" && !isPlaceholderMedia(article.cover);
}

export function episodePreviewNumbers(episodeCount?: number, limit = 12): number[] {
  if (!episodeCount || episodeCount < 1 || limit < 1) return [];
  return Array.from({ length: Math.min(episodeCount, limit) }, (_, index) => index + 1);
}

export function storeStatusLabel(store: DownloadSettings["ios"]): string {
  if (store.availability === "available" && store.url) return "Available";
  if (store.availability === "temporarily-unavailable") return "Temporarily unavailable";
  return "Coming soon";
}

export function articleNeighbors(articles: Article[], slug: string) {
  const list = publishedArticles(articles);
  const index = list.findIndex((article) => article.slug === slug);
  if (index < 0) return { previous: undefined, next: undefined };
  return { previous: list[index - 1], next: list[index + 1] };
}
