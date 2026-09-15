"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { articles, creatorSteps, dramas } from "@/data/site";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { PhoneMockup } from "@/components/media/phone-mockup";
import { ArticleCard } from "@/components/article/article-card";
import { VideoMedia } from "@/components/media/video-media";
import { mediaAssets } from "@/data/assets";
import type { HomePage } from "@/content/types";

export function HeroSection({ content }: { content?: HomePage["hero"] }) {
  return <section className="hero">
    <div className="hero-grain"/><div className="hero-orbit hero-orbit--blue"/><div className="hero-orbit hero-orbit--gold"/>
    <div className="container hero-grid">
      <div className="hero-copy">
        <span className="eyebrow hero-kicker">Short drama · creator platform</span>
        <h1><span className="hero-line">{content?.title ?? "追劇，是開始。"}</span><span className="hero-line hero-line--gold">{content?.subtitle ?? "創作，才是你的主場。"}</span></h1>
        <p className="lede">{content?.description ?? "My Dream 集結熱門短劇、原創內容與創作者社群，讓你從觀看走向創作的影音平台。"}</p>
        <div className="button-row"><Button href="/download">立即下載 My Dream</Button><Button href="/creator" variant="ghost">成為創作者</Button></div>
      </div>
      <div className="hero-art">
        <div className="floating-poster floating-poster--one"><div className="article-image" style={{ "--cover": "linear-gradient(135deg,#d7915c,#a83d58 52%,#1b315b)" } as React.CSSProperties}/></div>
        <PhoneMockup priority/>
        <div className="floating-poster floating-poster--two"><div className="article-image" style={{ "--cover": "linear-gradient(135deg,#1c7398,#d1bd71 56%,#33204a)" } as React.CSSProperties}/></div>
      </div>
    </div>
  </section>;
}

export function BrandStatement({ content }: { content?: HomePage["brandStatement"] }) {
  return <section className="statement"><div className="container"><div className="statement-words"><span><i>WATCH</i><b>追劇</b></span><span><i>CREATE</i><b>創作</b></span><span><i>SHARE</i><b>分享</b></span></div><p>{content?.description ?? "不只觀看別人的故事，也讓世界看見你的故事。"}</p></div></section>;
}

export function IdentitySection({ content }: { content?: HomePage["viewerCreator"] }) {
  return <section className="section identity section--ink"><div className="container"><SectionHeading eyebrow="一個平台，兩種身份" title={content?.title ?? "今天是觀眾，明天也可以是創作者。"}/><div className="identity-grid">
    <div className="identity-card identity-card--viewer"><span className="eyebrow">Viewer</span><h3>我是觀眾</h3><p>從此刻想看的故事出發，發現下一部讓你停不下來的短劇。</p><ul><li>探索熱門短劇</li><li>分類搜尋</li><li>熱門推薦與收藏</li><li>任務解鎖</li></ul><Button href="/explore" variant="ghost">探索短劇</Button></div>
    <PhoneMockup mode="identity" className="phone--identity"/>
    <div className="identity-card identity-card--creator"><span className="eyebrow">Creator</span><h3>我是創作者</h3><p>把你想分享的生活、靈感與作品，慢慢變成自己的內容身份。</p><ul><li>建立創作者身份</li><li>上傳短影音</li><li>發布與經營內容</li><li>累積粉絲</li></ul><Button href="/creator">前往創作者中心</Button></div>
  </div></div></section>;
}

const discoveryItems = [
  { eyebrow: "短劇片庫", title: "分類、搜尋與片單，在同一個入口。", type: "image" as const, asset: mediaAssets.app.dramaLibrary },
  { eyebrow: "熱門預覽", title: "在真實短劇畫面裡，快速找到下一部。", type: "video" as const },
  { eyebrow: "探索搜尋", title: "用關鍵字和分類，把選擇範圍縮小。", type: "image" as const, asset: mediaAssets.app.search },
];

export function DramaDiscovery({ content }: { content?: HomePage["dramaDiscovery"] }) {
  return <section className="section drama-discovery"><div className="container"><SectionHeading eyebrow="Drama discovery" title={content?.title ?? "下一部讓你停不下來的故事。"} text={content?.description ?? "從熱門作品到全新內容，打開 My Dream，找到剛好適合現在的短劇。"}/></div><div className="drama-track">{discoveryItems.map(item => <article className="feature-card" key={item.title}><div className="feature-card__media">{item.type === "video" ? <VideoMedia src={mediaAssets.video.dramaPromo.src} poster={mediaAssets.video.dramaPromo.poster} alt="My Dream 短劇預覽" loop className="feature-card__video"/> : <Image src={item.asset.src} alt={item.asset.alt} width={item.asset.width} height={item.asset.height} sizes="(max-width: 600px) 68vw, 300px"/>}</div><div><span className="eyebrow">{item.eyebrow}</span><h3>{item.title}</h3></div></article>)}</div></section>;
}

export function SearchExperience() {
  const [query, setQuery] = useState("");
  useEffect(() => { if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; const phrase = "Chained by Her Love"; let index = 0; const timer = window.setInterval(() => { index += 1; setQuery(phrase.slice(0, index)); if (index === phrase.length) window.clearInterval(timer); }, 70); return () => window.clearInterval(timer); }, []);
  return <section className="section"><div className="container"><SectionHeading eyebrow="搜尋探索" title="想看什麼？直接搜尋。" text="從分類與關鍵字開始，快速縮小選擇範圍。"/><div className="search-demo-layout"><div className="search-shell"><label className="search-bar"><Search aria-hidden/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="輸入片名或關鍵字" aria-label="搜尋短劇"/></label><div className="search-results">{dramas.slice(0, 4).map(item => <div className="mini-result" key={item.slug}>{item.title}</div>)}</div></div><PhoneMockup mode="search"/></div></div></section>;
}

export function CreatorCenter({ content }: { content?: HomePage["creatorCenter"] }) {
  return <section className="section section--ink creator-center"><div className="creator-ambient"/><div className="container"><SectionHeading eyebrow="Creator center" title={content?.title ?? "不只是看劇，你的故事，也值得被看見。"}/><div className="steps-layout"><div className="step-list">{creatorSteps.map(step => <article className="step" key={step.step}><span className="step-ghost">{step.step}</span><div><h3>{step.title}</h3><p>{step.description}</p></div></article>)}</div><PhoneMockup mode="creator"/></div></div></section>;
}

export function CreatorFeed({ content }: { content?: HomePage["creatorFeed"] }) {
  return <section className="section"><div className="container"><SectionHeading eyebrow="Creator feed" title={content?.title ?? "每一段日常，都能成為有人想看的內容。"}/></div><div className="feed"><PhoneMockup mode="creator"/><div className="feed-video"><VideoMedia src={mediaAssets.video.dramaPromo.src} poster={mediaAssets.video.dramaPromo.poster} alt="My Dream 創作內容預覽" loop/></div><PhoneMockup mode="dramaLibrary"/></div></section>;
}

export function RewardsProfile({ rewards, profile }: { rewards?: HomePage["rewards"]; profile?: HomePage["profile"] }) {
  return <><section className="section section--ink"><div className="container rewards"><div><SectionHeading eyebrow="Rewards" title={rewards?.title ?? "看劇，也有更多樂趣。"} text={rewards?.description ?? "從每天的小任務到解鎖更多內容，讓每一次參與都有下一步。"}/><div className="reward-flow">{["每日簽到", "觀看內容", "完成任務", "解鎖更多故事"].map((item, index) => <div className="reward-node" key={item}><b>{index + 1}</b>{item}</div>)}</div></div><PhoneMockup mode="rewards"/></div></section><section className="section"><div className="container profile-grid"><PhoneMockup mode="profile"/><div><SectionHeading eyebrow="Your profile" title={profile?.title ?? "建立屬於你的內容身份。"} text={profile?.description ?? "把作品、收藏、關注與分享整理在同一個內容入口；實際資料將在 APP 正式服務啟用後呈現。"}/><div className="profile-capabilities"><span>作品整理</span><span>收藏管理</span><span>關注互動</span></div></div></div></section></>;
}

export function LatestJournal({ content }: { content?: HomePage["latestContent"] }) {
  const [tab, setTab] = useState("最新短劇");
  return <section className="section section--ink"><div className="container"><SectionHeading eyebrow="Latest from My Dream" title={content?.title ?? "你關心的，都在持續發生。"}/><div className="tabs">{["最新短劇", "創作者精選", "平台消息"].map(item => <button className={tab === item ? "active" : ""} onClick={() => setTab(item)} key={item}>{item}</button>)}</div><div className="content-grid">{articles.map(article => <ArticleCard key={`${tab}-${article.slug}`} article={{ ...article, category: tab === "最新短劇" ? article.category : tab }}/>)}</div></div></section>;
}

export function JournalSection({ content }: { content?: HomePage["journal"] }) {
  return <section className="section"><div className="container"><SectionHeading eyebrow="Journal" title={content?.title ?? "把每一次發現，寫成更長的故事。"} text={content?.description ?? "短劇推薦、創作者教學與平台消息，都是為下一次探索留下的入口。"}/><div className="content-grid">{articles.map(article => <ArticleCard key={article.slug} article={article}/>)}</div><p style={{ marginTop: "2rem" }}><Button href="/journal" variant="ghost">閱讀 My Dream 內容誌</Button></p></div></section>;
}

export function DownloadSection({ content }: { content?: HomePage["downloadCTA"] }) {
  return <section className="download-band"><div className="container download-grid"><div><span className="eyebrow">My Dream app</span><h2 className="display" style={{ margin: ".7rem 0 1.2rem" }}>{content?.title ?? "下一個故事，從 My Dream 開始。"}</h2><p className="lede" style={{ marginBottom: "1.5rem" }}>{content?.description ?? "下載 APP，探索更多短劇，也開啟屬於你的創作舞台。"}</p><div className="button-row"><Button disabled>App Store 即將開放</Button><Button variant="ghost" disabled>Google Play 即將開放</Button></div><p className="form-note" style={{ marginTop: "1rem" }}>商店連結準備中，正式上線後將在此提供。</p></div><div className="download-media"><VideoMedia src={mediaAssets.video.logoIntro.src} poster={mediaAssets.video.logoIntro.poster} alt="My Dream Logo 動畫"/></div></div></section>;
}
