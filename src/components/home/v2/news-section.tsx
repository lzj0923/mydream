import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { v2Assets } from "@/data/v2-assets";
import type { V2HomeModel } from "@/features/v2/home-model";
import { V2SectionHeading } from "./section-heading";

export function V2NewsSection({ model }: { model: V2HomeModel }) {
  return (
    <section className="v2-section v2-news" id="latest-news">
      <Image className="v2-section-bg" src={v2Assets.backgrounds.news} alt="" fill sizes="100vw" />
      <div className="v2-section-scrim" />
      <div className="v2-section-shell">
        <V2SectionHeading index="06" eyebrow={model.news.eyebrow} title={model.news.title} description={model.news.description} />
        <Link className="v2-text-link" href="/journal">查看全部消息<ArrowRight size={17} aria-hidden /></Link>
      </div>
      <div className="v2-news-grid">
        {model.articles.map((article, index) => (
          <article className={index === 0 ? "is-featured" : ""} key={`${article.title}-${index}`} data-motion="reveal-card">
            <Link href={article.href}>
              <div className="v2-news-image">
                <Image src={article.image.src} alt={article.image.alt} fill sizes={index === 0 ? "(max-width: 760px) 92vw, 54vw" : "(max-width: 760px) 92vw, 28vw"} />
              </div>
              <div className="v2-news-copy">
                <small>{article.meta}{article.publishedAt ? ` · ${article.publishedAt}` : ""}</small>
                <h3>{article.title}</h3>
                <p>{article.excerpt}</p>
                <b>READ STORY <ArrowRight size={15} aria-hidden /></b>
              </div>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
