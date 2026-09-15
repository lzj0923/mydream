import type { Article, ArticleCategory } from "@/content/types";
import { isPlaceholderMedia } from "@/content/validation";

const byPublicationPriority = (left: Article, right: Article) => {
  const featured = Number(right.featured) - Number(left.featured);
  return featured || right.publishedAt.localeCompare(left.publishedAt);
};

const publicNewsArticles = (articles: Article[]) => articles
  .filter((article) => article.publicationStatus === "published" && !isPlaceholderMedia(article.cover))
  .sort(byPublicationPriority);

export type NewsIndexModel = {
  basePath: "/news";
  articles: Article[];
  categories: ArticleCategory[];
};

export type NewsDetailModel = {
  basePath: "/news";
  article: Article;
  related: Article[];
  previous?: Article;
  next?: Article;
};

export function buildNewsIndexModel({
  articles,
  categories,
}: {
  articles: Article[];
  categories: ArticleCategory[];
}): NewsIndexModel {
  const published = publicNewsArticles(articles);
  const categoryIds = new Set(published.map((article) => article.categoryId));
  return {
    basePath: "/news",
    articles: published,
    categories: categories
      .filter((category) => category.contentStatus === "published" && categoryIds.has(category.id))
      .sort((left, right) => left.order - right.order),
  };
}

export function buildNewsDetailModel({
  article,
  articles,
}: {
  article: Article;
  articles: Article[];
}): NewsDetailModel | null {
  if (article.publicationStatus !== "published" || isPlaceholderMedia(article.cover)) return null;

  const published = publicNewsArticles(articles);
  const index = published.findIndex((item) => item.id === article.id);
  const related = published
    .filter((item) => item.id !== article.id && item.categoryId === article.categoryId)
    .slice(0, 3);

  return {
    basePath: "/news",
    article,
    related,
    previous: index > 0 ? published[index - 1] : undefined,
    next: index >= 0 ? published[index + 1] : undefined,
  };
}
