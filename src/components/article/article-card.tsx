import Link from "next/link";
import type { Article as ContentArticle } from "@/content/types";
import type { Article as LegacyArticle } from "@/types/content";

type ArticleCardItem = LegacyArticle | ContentArticle;
function isContentArticle(article: ArticleCardItem): article is ContentArticle { return "cover" in article && typeof article.cover !== "string"; }

export function ArticleCard({ article }: { article: ArticleCardItem }) {
  const cover = isContentArticle(article) ? `url(${article.cover.src}) center / cover` : article.cover;
  return <Link href={`/journal/${article.slug}`} className="article-card"><div className="article-image" style={{ "--cover": cover } as React.CSSProperties}/><div><span className="chip">{article.category}</span><h3>{article.title}</h3><p>{article.excerpt}</p><small className="eyebrow">{article.publishedAt}</small></div></Link>;
}
