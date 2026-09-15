import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";

import { ArticleBody } from "@/components/v2/journal/article-body";
import { V2ArticleCard } from "@/components/v2/journal/article-card";
import { V2PageHero } from "@/components/v2/page-hero/page-hero";
import { ShareAction } from "@/components/v2/shared/share-action";
import { getManagedContent } from "@/content/cms/java-cms-client";
import { getSiteSettings } from "@/content/queries";
import { buildArticleJsonLd, buildSeoMetadata, serializeJsonLd } from "@/content/seo";
import { prototypeOfficialNewsArticles } from "@/data/jyg-news-prototype";
import { managedNewsArticles } from "@/features/jyg/managed-news";
import { buildNewsDetailModel } from "@/features/jyg/news-model";

export async function generateStaticParams() {
  const articles = managedNewsArticles(await getManagedContent("article"), prototypeOfficialNewsArticles);
  return Array.from(new Set(articles.map(({ slug }) => slug)))
    .map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [site, managed] = await Promise.all([getSiteSettings(), getManagedContent("article")]);
  const article = managedNewsArticles(managed, prototypeOfficialNewsArticles).find((item) => item.slug === slug);
  if (!article) return {};
  return buildSeoMetadata(site, {
    ...article.seo,
    title: article.seo?.title || article.title,
    description: article.seo?.description || article.excerpt,
    canonicalPath: article.seo?.canonicalPath || `/news/${article.slug}`,
    ogImage: article.seo?.ogImage || article.cover,
    type: "article",
  });
}

export default async function NewsArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [site, managed] = await Promise.all([getSiteSettings(), getManagedContent("article")]);
  const articles = managedNewsArticles(managed, prototypeOfficialNewsArticles);
  const article = articles.find((item) => item.slug === slug);
  if (!article) notFound();
  const model = buildNewsDetailModel({ article, articles });
  if (!model) notFound();

  const structuredData = buildArticleJsonLd(site, model.article, { basePath: model.basePath });

  return (
    <div className="v2-page v2-article-page">
      {structuredData.map((item, index) => <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(item) }} />)}
      <V2PageHero
        variant="compact"
        eyebrow={`${model.article.category} · ${model.article.publishedAt}`}
        title={model.article.title}
        description={model.article.subtitle || model.article.excerpt}
        background={model.article.cover}
        breadcrumbs={[{ label: "首頁", href: "/" }, { label: "最新消息", href: model.basePath }, { label: model.article.category }, { label: model.article.title }]}
      />

      <article className="v2-page-section">
        <div className="v2-page-shell v2-article-shell">
          <header className="v2-article-meta" data-motion="reveal">
            <div><strong>劇有梗撰寫</strong></div>
            <div><strong>{model.article.publishedAt}</strong></div>
            <ShareAction title={model.article.title} label="分享文章" />
          </header>
          <figure className="v2-article-cover" data-motion="mask-reveal">
            <Image src={model.article.cover.src} alt={model.article.cover.alt} fill sizes="(max-width: 900px) 100vw, 1160px" priority unoptimized={model.article.cover.src.startsWith("http")} />
          </figure>
          <ArticleBody article={model.article} />
          <nav className="v2-article-neighbors" aria-label="上一篇與下一篇">
            {model.previous ? <Link href={`${model.basePath}/${model.previous.slug}`}><ArrowLeft size={17} aria-hidden /><span>上一篇<small>{model.previous.title}</small></span></Link> : <span />}
            {model.next ? <Link href={`${model.basePath}/${model.next.slug}`}><span>下一篇<small>{model.next.title}</small></span><ArrowRight size={17} aria-hidden /></Link> : <span />}
          </nav>
          <p className="v2-back-link"><Link href={model.basePath}><ArrowLeft size={16} aria-hidden />返回最新消息</Link></p>
        </div>
      </article>

      <section className="v2-page-section v2-page-section--ink" id="related-reading">
        <div className="v2-page-shell">
          <div className="v2-library-intro" data-motion="reveal"><h2>相關文章</h2><p>只顯示同分類且已發布的 CMS 文章。</p></div>
          {model.related.length ? <div className="v2-magazine-grid" data-motion="cascade">{model.related.map((item) => <V2ArticleCard article={item} basePath={model.basePath} key={item.id} />)}</div> : <p className="v2-page-note">目前沒有其他同分類的已發布文章。</p>}
        </div>
      </section>
      <section className="v2-page-cta" data-motion="reveal"><h2>讀完一頁，再去遇見下一部故事。</h2><Link className="v2-cta v2-cta--primary" href="/works">探索作品</Link></section>
    </div>
  );
}
