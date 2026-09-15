import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { Article } from "@/content/types";

export function V2ArticleCard({ article, featured = false, priority = false, basePath = "/journal" }: { article: Article; featured?: boolean; priority?: boolean; basePath?: "/journal" | "/news" }) {
  return (
    <article className={`v2-magazine-card${featured ? " is-featured" : ""}`}>
      <Link href={`${basePath}/${article.slug}`}>
        <div className="v2-magazine-card__image">
          <Image src={article.cover.src} alt={article.cover.alt} fill sizes={featured ? "(max-width: 800px) 100vw, 58vw" : "(max-width: 600px) 100vw, 30vw"} priority={priority} unoptimized={article.cover.src.startsWith("http")} />
          <span>{article.category}</span>
        </div>
        <div className="v2-magazine-card__copy">
          <small>{article.publishedAt} · {article.author}</small>
          <h3 className="v2-card-title">{article.title}</h3>
          <p className="v2-card-summary">{article.excerpt}</p>
          <b>閱讀全文<ArrowRight size={14} aria-hidden /></b>
        </div>
      </Link>
    </article>
  );
}
