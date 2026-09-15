import Image from "next/image";
import Link from "next/link";
import { Download, PlayCircle, UserRound } from "lucide-react";
import { notFound } from "next/navigation";

import { EpisodeShowcase } from "@/components/v2/drama/episode-showcase";
import { V2DramaCard } from "@/components/v2/drama/drama-card";
import { V2SectionHeading } from "@/components/v2/shared/section-heading";
import { ShareAction } from "@/components/v2/shared/share-action";
import { getDownloadSettings, getDrama, getDramas, getSiteSettings } from "@/content/queries";
import { buildDramaJsonLd, buildSeoMetadata, serializeJsonLd } from "@/content/seo";
import { isPlaceholderMedia } from "@/content/validation";
import { v2Assets } from "@/data/v2-assets";
import { isPublicDrama, publishedDramas } from "@/features/v2/internal-model";
import { resolveDramaDeepLink } from "@/lib/deeplink";

export async function generateStaticParams() {
  return publishedDramas(await getDramas()).map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [site, drama] = await Promise.all([getSiteSettings(), getDrama(slug)]);
  if (!drama) return {};
  const publicContent = isPublicDrama(drama);
  return buildSeoMetadata(site, {
    ...drama.seo,
    title: drama.seo?.title || drama.title,
    description: drama.seo?.description || drama.synopsis,
    canonicalPath: `/drama/${drama.slug}`,
    ogImage: publicContent ? drama.poster : undefined,
    type: "article",
    noIndex: !publicContent || drama.seo?.noIndex,
  });
}

export default async function DramaDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [site, drama, download, allDramas] = await Promise.all([getSiteSettings(), getDrama(slug), getDownloadSettings(), getDramas()]);
  if (!drama) notFound();

  const publicContent = isPublicDrama(drama);
  const related = publishedDramas(allDramas).filter((item) => item.slug !== drama.slug).slice(0, 3);
  const structuredData = buildDramaJsonLd(site, drama);
  const appTarget = drama.appUrl ? { href: drama.appUrl, kind: "app" as const } : resolveDramaDeepLink(drama.slug, download);
  const cta = appTarget.kind === "app" ? "在 My Dream APP 開啟" : appTarget.kind === "download" ? "下載 My Dream APP" : "前往下載說明";
  const heroBackground = isPlaceholderMedia(drama.poster) ? v2Assets.backgrounds.hero : drama.poster;

  return (
    <div className="v2-page v2-drama-detail">
      {structuredData.map((item, index) => <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(item) }} />)}
      <section className="v2-drama-stage">
        <div className="v2-page-shell">
          <nav className="v2-breadcrumbs" aria-label="Breadcrumb"><ol><li><Link href="/">首頁</Link></li><li><Link href="/explore">探索短劇</Link></li><li><span aria-current="page">{drama.title}</span></li></ol></nav>
          {!publicContent && <p className="v2-draft-notice">此內容目前不是可公開發布版本，頁面已設為 noindex，且不會進入公開索引。</p>}
          <div className="v2-drama-console">
            <div className="v2-static-player" data-motion="mask-reveal">
              <Image src={heroBackground.src} alt="" fill sizes="(max-width: 900px) 100vw, 66vw" priority />
              <div className="v2-player-center"><PlayCircle aria-hidden /><strong>播放器視覺示意</strong><span>官網不提供真實串流或會員解鎖</span></div>
              <div className="v2-player-controls"><span>▶</span><i /><small>00:00 / --:--</small><b>1080P</b></div>
            </div>
            <aside className="v2-drama-episodes"><EpisodeShowcase episodeCount={drama.episodes} /></aside>
          </div>
          <div className="v2-drama-info-grid">
            <article className="v2-drama-profile" data-motion="reveal">
              <div className="v2-drama-profile__head"><div><span className="v2-page-kicker">{drama.categories.join(" · ")} · {drama.availability.toUpperCase()}</span><h1>{drama.title}</h1></div><div className="v2-page-actions"><Link className="v2-cta v2-cta--primary" href={appTarget.href}><Download size={16} aria-hidden />{cta}</Link><ShareAction title={drama.title} /></div></div>
              <p className="v2-drama-synopsis">{drama.synopsis}</p>
              <div className="v2-tag-list">{drama.categories.map((category) => <span key={category}>{category}</span>)}{drama.tags.map((tag) => <span key={tag}>{tag}</span>)}{drama.episodes && <span>{drama.episodes} 集</span>}</div>
            </article>
            <aside className="v2-creator-summary"><UserRound aria-hidden /><div><h2>創作者資訊</h2><p>目前 CMS 未提供本劇的公開創作者與演員資料。</p></div></aside>
          </div>
        </div>
      </section>
      <section className="v2-page-section" id="related-dramas">
        <div className="v2-page-shell">
          <V2SectionHeading index="01" eyebrow="MORE STORIES" title="為你推薦" description="只推薦 CMS 已發布且使用正式素材的短劇。" />
          {related.length ? <div className="v2-library-grid" data-motion="cascade">{related.map((item) => <V2DramaCard key={item.id} drama={item} />)}</div> : <p className="v2-page-note">目前沒有其他已發布短劇可推薦。</p>}
        </div>
      </section>
    </div>
  );
}
