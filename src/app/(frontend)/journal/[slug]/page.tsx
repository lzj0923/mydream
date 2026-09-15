import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";

import { ArticleBody } from "@/components/v2/journal/article-body";
import { V2ArticleCard } from "@/components/v2/journal/article-card";
import { V2PageHero } from "@/components/v2/page-hero/page-hero";
import { ShareAction } from "@/components/v2/shared/share-action";
import { getArticle, getArticles, getSiteSettings } from "@/content/queries";
import { buildArticleJsonLd, buildSeoMetadata, serializeJsonLd } from "@/content/seo";
import { v2Assets } from "@/data/v2-assets";
import { articleNeighbors, isPublicArticle, publishedArticles } from "@/features/v2/internal-model";

export async function generateStaticParams() {
  return publishedArticles(await getArticles()).map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [site, article] = await Promise.all([getSiteSettings(), getArticle(slug)]);
  if (!article) return {};
  const publicContent = isPublicArticle(article);
  return buildSeoMetadata(site, {
    ...article.seo,
    title: article.seo?.title || article.title,
    description: article.seo?.description || article.excerpt,
    canonicalPath: `/journal/${article.slug}`,
    ogImage: publicContent ? article.cover : undefined,
    type: "article",
    noIndex: !publicContent || article.seo?.noIndex,
  });
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [site, article, allArticles] = await Promise.all([getSiteSettings(), getArticle(slug), getArticles()]);
  if (!article) notFound();

  const publicContent = isPublicArticle(article);
  const publicArticles = publishedArticles(allArticles);
  const related = publicArticles.filter((item) => item.slug !== article.slug && item.categoryId === article.categoryId).slice(0, 3);
  const { previous, next } = articleNeighbors(allArticles, article.slug);
  const structuredData = buildArticleJsonLd(site, article);
  const background = publicContent ? article.cover : v2Assets.backgrounds.news;

  return (
    <div className="v2-page v2-article-page">
      {structuredData.map((item, index) => <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(item) }} />)}
      <V2PageHero
        variant="compact"
        eyebrow={`${article.category} · ${article.publishedAt}`}
        title={article.title}
        description={article.excerpt}
        background={background}
        breadcrumbs={[{ label: "首頁", href: "/" }, { label: "最新消息", href: "/journal" }, { label: article.category }, { label: article.title }]}
      />

      <article className="v2-page-section">
        <div className="v2-page-shell v2-article-shell">
          {!publicContent && <p className="v2-draft-notice">此文章目前為草稿或使用示意素材，頁面已設為 noindex，且不會進入列表、JSON-LD 或 sitemap。</p>}
          <header className="v2-article-meta" data-motion="reveal">
            <div><strong>{article.author}</strong></div>
            <div><strong>{article.publishedAt}</strong></div>
            <ShareAction title={article.title} label="分享文章" />
          </header>
          <figure className="v2-article-cover" data-motion="mask-reveal"><Image src={article.cover.src} alt={article.cover.alt} fill sizes="(max-width: 900px) 100vw, 1160px" priority />{!publicContent && <figcaption>草稿／視覺示意，不進入公開索引</figcaption>}</figure>
          <ArticleBody article={article} />
          <nav className="v2-article-neighbors" aria-label="上一篇與下一篇">
            {previous ? <Link href={`/journal/${previous.slug}`}><ArrowLeft size={17} aria-hidden /><span>上一篇<small>{previous.title}</small></span></Link> : <span />}
            {next ? <Link href={`/journal/${next.slug}`}><span>下一篇<small>{next.title}</small></span><ArrowRight size={17} aria-hidden /></Link> : <span />}
          </nav>
          <p className="v2-back-link"><Link href="/journal"><ArrowLeft size={16} aria-hidden />返回最新消息</Link></p>
        </div>
      </article>

      <section className="v2-page-section v2-page-section--ink" id="related-reading">
        <div className="v2-page-shell">
          <div className="v2-library-intro" data-motion="reveal"><h2>相關文章</h2><p>只顯示同分類且已發布的 CMS 文章。</p></div>
          {related.length ? <div className="v2-magazine-grid" data-motion="cascade">{related.map((item) => <V2ArticleCard article={item} key={item.id} />)}</div> : <p className="v2-page-note">目前沒有其他同分類的已發布文章。</p>}
        </div>
      </section>
      <section className="v2-page-cta" data-motion="reveal"><h2>讀完一頁，再去遇見下一部故事。</h2><Link className="v2-cta v2-cta--primary" href="/explore">探索短劇</Link></section>
    </div>
  );
}
