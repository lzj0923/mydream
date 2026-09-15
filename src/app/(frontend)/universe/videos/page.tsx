import type { Metadata } from "next";
import Image from "next/image";
import { VideoDuration } from "@/components/creator-workspace/video-duration";
import Link from "next/link";
import { ArrowRight, ChevronLeft, Eye, Play } from "lucide-react";

import { prototypeOriginalVideos } from "@/data/jyg-video-prototype";
import { getManagedContent } from "@/content/cms/java-cms-client";
import { managedOriginalVideoList } from "@/features/jyg/managed-universe";

export const metadata: Metadata = {
  title: "AI原創影片｜AI宇宙",
  description: "觀看劇有梗 AI 原創動畫與概念短片。",
};

export default async function OriginalVideoLibraryPage() {
  const managedVideos = managedOriginalVideoList(await getManagedContent("original-video", "zh-Hant", 100));
  const videos = managedVideos.length ? managedVideos : prototypeOriginalVideos;
  return (
    <div className="jyg-prototype jyg-video-library-page">
      <section className="jyg-video-library-hero" aria-labelledby="video-library-title">
        <Image
          className="jyg-video-library-hero__art"
          src={prototypeOriginalVideos[1].posterSrc}
          alt=""
          fill
          priority
          sizes="100vw"
          unoptimized
        />
        <span className="jyg-video-library-hero__veil" aria-hidden />
        <span className="jyg-video-library-hero__stars" aria-hidden />
        <div className="jyg-shell jyg-video-library-hero__content">
          <Link href="/universe"><ChevronLeft aria-hidden />返回 AI 宇宙</Link>
          <h1 id="video-library-title">AI原創影片</h1>
          <p>從 AI 角色、概念場景到動態敘事，<br />探索劇有梗正在創造的原創影像世界。</p>
        </div>
      </section>

      <main className="jyg-video-library-main">
        <section className="jyg-shell" aria-labelledby="video-library-list-title">
          <header className="jyg-video-library-heading">
            <div>
              <h2 id="video-library-list-title">最新 AI 原創影片</h2>
              <p>{managedVideos.length ? "由後台內容管理中心實時提供的 AI 原創影片。" : "目前展示 AI 原創影片示例。"}</p>
            </div>
          </header>

          <div className="jyg-video-library-grid">
            {videos.map((video) => (
              <article className="jyg-video-card" key={video.slug}>
                <Link className="jyg-video-card__visual" href={`/universe/videos/${video.slug}`} aria-label={`播放${video.title}`}>
                  {video.posterSrc ? <Image src={video.posterSrc} alt={video.posterAlt} fill sizes="(max-width: 700px) 100vw, 50vw" unoptimized /> : video.videoSrc ? <video src={video.videoSrc} muted playsInline preload="metadata" aria-label={`${video.title}影片封面`} /> : null}
                  <span><Play fill="currentColor" aria-hidden /></span>
                  <time><VideoDuration seconds={video.durationSeconds} src={video.videoSrc} /></time>
                </Link>
                <div className="jyg-video-card__copy">
                  <div><span>{video.type}</span><time>{video.publishedAt}</time></div>
                  <h2>{video.title}</h2>
                  <p>{video.description}</p>
                  <footer>
                    <span><Eye aria-hidden />觀看數 {video.views}</span>
                    <Link href={`/universe/videos/${video.slug}`}>觀看影片 <ArrowRight aria-hidden /></Link>
                  </footer>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
