"use client";

import Image from "next/image";
import { VideoDuration } from "@/components/creator-workspace/video-duration";
import Link from "next/link";
import {
  ArrowRight,
  Clock3,
  Eye,
  Film,
  GraduationCap,
  MessageSquareText,
  Play,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo } from "react";

import { HeroBackground } from "@/components/prototype/hero-background";
import type { CmsContent, CmsPage } from "@/content/cms/java-cms-client";
import { safeFooterHref } from "@/content/cms/footer-settings";
import { managedBlock, managedBlockProps, managedBlockStyle, managedFieldStyle } from "@/content/cms/managed-page-style";
import { prototypeOriginalVideos } from "@/data/jyg-video-prototype";
import { aiCommunityInviteHref } from "@/lib/app-links";

const categories = [
  { id: "original", icon: Film, title: "AI 原創影片", description: "精選 AI 原創短劇、動畫與系列故事，沉浸體驗 AI 帶來的全新視覺敘事。", action: "立即觀看", href: "/universe/videos", accent: "gold" },
  { id: "tutorial", icon: GraduationCap, title: "AI 教學影片", description: "從入門到進階，完整教學影片與實戰技巧，帶你掌握 AI 創作能力。", action: "開始學習", href: "#ai-tutorials", accent: "blue" },
  { id: "prompt", icon: MessageSquareText, title: "提示詞大全", description: "精選高效提示詞與範例，激發創作靈感，讓 AI 更懂你的想像。", action: "探索提示詞", href: "https://drive.google.com/drive/folders/1Kw1EQ_wq3UE7bmwJesK_8QyMWHI1G9-X", accent: "gold" },
] as const;

const aiCreationHeroImage = "/assets/jyg/ai-creation-center-hero-v1.png";
const legacyAiCreationHeroImage = "/cms-media/assets/jyg/ai-creation-center-hero-v1.png";

const fallbackContents = prototypeOriginalVideos.map((video) => ({
    slug: video.slug,
    type: "original",
    label: video.type,
    title: video.title,
    image: video.posterSrc,
    videoSrc: video.videoSrc,
    duration: video.duration,
    durationSeconds: video.durationSeconds,
    views: video.views,
    date: video.publishedAt,
    href: `/universe/videos/${video.slug}`,
  }));

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function lines(value: unknown, fallback: string) {
  return text(value, fallback).split(/\r?\n/).map((line, index) => (
    <span key={`${index}-${line}`}>{index > 0 ? <br /> : null}{line}</span>
  ));
}

export function JygAiUniverseHub({
  managedOriginalVideos = [],
  managedTutorials = [],
  managedInspirations = [],
  initialCategory,
  managedPage,
}: {
  managedOriginalVideos?: CmsContent[];
  managedTutorials?: CmsContent[];
  managedInspirations?: CmsContent[];
  initialCategory?: string;
  managedPage?: CmsPage | null;
}) {
  const heroProps = managedBlockProps(managedPage, "hero");
  const heroBlock = managedBlock(managedPage, "hero");
  const categoriesProps = managedBlockProps(managedPage, "categories");
  const contentProps = managedBlockProps(managedPage, "content");
  const tutorialsBlock = managedBlock(managedPage, "tutorials");
  const tutorialsProps = managedBlockProps(managedPage, "tutorials");
  const communityBlock = managedBlock(managedPage, "community");
  const communityProps = managedBlockProps(managedPage, "community");
  const configuredHeroImage = text(heroProps.backgroundUrl);
  const heroImage = configuredHeroImage === legacyAiCreationHeroImage
    ? aiCreationHeroImage
    : configuredHeroImage && !configuredHeroImage.endsWith("/prototype/jyg/ip-worlds.webp")
    ? configuredHeroImage
    : aiCreationHeroImage;
  const heroPosition = text(heroProps.backgroundPosition, "50% 50%");
  const heroMobilePosition = text(heroProps.mobileBackgroundPosition, "72% 50%");
  const heroStyle = managedBlockStyle(heroBlock, { includeBackgroundImage: false, hero: true });
  const categoriesStyle = managedBlockStyle(managedBlock(managedPage, "categories"));
  const contentStyle = managedBlockStyle(managedBlock(managedPage, "content"));

  useEffect(() => {
    if (initialCategory === "tutorial") {
      const frame = window.requestAnimationFrame(() => document.getElementById("ai-tutorials")?.scrollIntoView({ behavior: "smooth", block: "start" }));
      return () => window.cancelAnimationFrame(frame);
    }
  }, [initialCategory]);

  const contents = useMemo(() => {
    const mapManaged = (items: CmsContent[], type: "original" | "tutorial" | "inspiration") => items
      .filter((video) => video.data.visible !== false)
      .map((video) => {
        const videoSrc = text(video.data.videoUrl);
        const image = text(video.coverUrl, videoSrc ? "" : "/cms-media/prototype/jyg/ip-worlds.webp");
        return {
          slug: video.slug,
          type,
          label: text(video.data.contentLabel, type === "original" ? "AI 原創影片" : type === "tutorial" ? "AI 教學影片" : "創作靈感"),
          title: video.title,
          image,
          videoSrc,
          duration: text(video.data.duration, type === "inspiration" ? "文章" : "完整內容"),
          durationSeconds: Number(video.data.durationSeconds) || 0,
          views: text(video.data.views, type === "inspiration" ? "待閱讀" : "待統計"),
          date: text(video.data.publishedAt, "即將上架"),
          href: type === "tutorial" ? `/universe/videos/${video.slug}` : text(video.data.href, type === "original" ? `/universe/videos/${video.slug}` : `/universe?category=${type}`),
        };
      });
    const originalVideos = mapManaged(managedOriginalVideos, "original");
    const tutorials = mapManaged(managedTutorials, "tutorial");
    const inspirations = mapManaged(managedInspirations, "inspiration");
    return [...(originalVideos.length ? originalVideos : fallbackContents), ...tutorials, ...inspirations];
  }, [managedInspirations, managedOriginalVideos, managedTutorials]);

  const originalContents = contents.filter((item) => item.type === "original");
  const tutorialContents = contents.filter((item) => item.type === "tutorial");

  const renderContentRail = (items: typeof contents) => items.length ? (
    <div className="jyg-ai-hub-content-rail">
      {items.map((item, index) => (
        <Link href={item.href} className="jyg-ai-hub-content-card" key={`${item.slug}-${item.type}`}>
          <span className="jyg-ai-hub-content-card__visual">
            {item.image ? <Image src={item.image} alt={item.title} fill sizes="(max-width:700px) 78vw, 25vw" priority={index === 0} unoptimized={item.image.startsWith("http")} /> : item.videoSrc ? <video src={item.videoSrc} muted playsInline preload="metadata" aria-label={`${item.title}影片封面`} /> : null}
            <i><Play aria-hidden /></i>
            <time><VideoDuration seconds={item.durationSeconds} src={item.videoSrc} /></time>
          </span>
          <span className="jyg-ai-hub-content-card__copy">
            <small>{item.label}</small>
            <strong>{item.title}</strong>
            <span><b><Eye aria-hidden /> {item.views}</b><b><Clock3 aria-hidden /> {item.date}</b></span>
          </span>
        </Link>
      ))}
    </div>
  ) : <div className="jyg-ai-hub-empty"><h3>內容準備中</h3><p>新內容即將上架。</p></div>;

  return (
    <div className="jyg-prototype jyg-ai-hub-page">
      <section className="jyg-ai-hub-hero" data-nav-hero data-nav-hero-centered aria-labelledby="ai-hub-title" data-cms-zone="hero" style={heroStyle}>
        <HeroBackground
          image={heroImage}
          alt="AI 原創宇宙與未來世界"
          theme="universe"
          position={heroPosition}
          mobilePosition={heroMobilePosition}
          priority
        />
        <span className="jyg-ai-hub-hero__stars" aria-hidden />
        <div className="jyg-shell jyg-ai-hub-hero__grid">
          <div className="jyg-ai-hub-hero__copy" data-nav-hero-copy>
            <h1 id="ai-hub-title" data-cms-field="title" style={managedFieldStyle(heroBlock, "title")}>{lines(heroProps.title, "AI 創作中心")}</h1>
            <h2 data-cms-field="subtitle" style={managedFieldStyle(heroBlock, "subtitle")}>{lines(heroProps.subtitle, "學習、創造、啟發")}</h2>
            <p data-cms-field="description" style={managedFieldStyle(heroBlock, "description")}>{lines(heroProps.description, "從原創成片、實戰教學到提示詞資源，\n一站式探索 AI 創作的無限可能。")}</p>
          </div>

        </div>
      </section>

      <main className="jyg-ai-hub-main">
        <section className="jyg-ai-hub-categories" aria-labelledby="ai-hub-category-title" data-cms-zone="categories" style={categoriesStyle}>
          <div className="jyg-shell">
            <h2 className="sr-only" id="ai-hub-category-title" data-cms-field="title">{text(categoriesProps.title, "創作入口")}</h2>
            <p className="sr-only" data-cms-field="description">{text(categoriesProps.description, "選擇適合你的 AI 學習與創作內容。")}</p>
            <div className="jyg-ai-hub-category-grid">
            {categories.map(({ id, icon: Icon, title, description, action, href, accent }) => (
                <Link className={`jyg-ai-hub-category-card jyg-ai-hub-category-card--${accent}`} href={href} key={id}>
                  <span><Icon aria-hidden /></span>
                  <div>
                    <h3>{title}</h3>
                    <p>{description}</p>
                    <b>{action}<ArrowRight aria-hidden /></b>
                  </div>
                </Link>
            ))}
            </div>
          </div>
        </section>

        <section className="jyg-ai-hub-content" id="ai-originals" aria-labelledby="ai-hub-content-title" data-cms-zone="content" style={contentStyle}>
          <div className="jyg-shell">
            <header className="jyg-ai-hub-section-head jyg-ai-hub-content__head">
              <div className="jyg-ai-hub-heading-copy"><div className="jyg-ai-hub-title-row"><h2 id="ai-hub-content-title" data-cms-field="title">{text(contentProps.title, "AI 原創影片")}</h2></div><p data-cms-field="description">{text(contentProps.description, "探索最新 AI 原創短劇與動畫作品")}</p></div>
              <Link href="/universe/videos">查看更多<ArrowRight aria-hidden /></Link>
            </header>
            {renderContentRail(originalContents)}
          </div>
        </section>

        <section className="jyg-ai-hub-content jyg-ai-hub-content--tutorials" id="ai-tutorials" aria-labelledby="ai-hub-tutorial-title" data-cms-zone="tutorials" style={managedBlockStyle(tutorialsBlock)}>
          <div className="jyg-shell">
            <header className="jyg-ai-hub-section-head jyg-ai-hub-content__head">
              <div className="jyg-ai-hub-heading-copy"><div className="jyg-ai-hub-title-row"><h2 id="ai-hub-tutorial-title" data-cms-field="title">{text(tutorialsProps.title, "AI 教學影片")}</h2></div><p data-cms-field="description">{text(tutorialsProps.description, "從基礎到進階，學會 AI 創作的關鍵技巧")}</p></div>
            </header>
            {renderContentRail(tutorialContents)}
          </div>
        </section>

        <section className="jyg-ai-hub-community" aria-label={text(communityProps.title, "加入創作者社群")} data-cms-zone="community" style={managedBlockStyle(communityBlock)}>
          <div className="jyg-shell jyg-ai-hub-community__panel">
            <UsersRound aria-hidden />
            <p data-cms-field="title">{lines(communityProps.title, "加入創作者社群，交流 AI 創作心得，\n獲得更多靈感與資源！")}</p>
            <Link href={safeFooterHref(aiCommunityInviteHref(communityProps.actionHref))} data-cms-field="actionLabel">{text(communityProps.actionLabel, "立即加入社群")}<ArrowRight aria-hidden /></Link>
          </div>
        </section>

      </main>
    </div>
  );
}
