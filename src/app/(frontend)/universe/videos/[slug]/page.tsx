import type { Metadata } from "next";
import Image from "next/image";
import { VideoDuration } from "@/components/creator-workspace/video-duration";
import Link from "next/link";
import { ArrowRight, ChevronLeft, Clock3, Eye, Film, MonitorPlay } from "lucide-react";
import { notFound } from "next/navigation";

import { findPrototypeOriginalVideo, prototypeOriginalVideos } from "@/data/jyg-video-prototype";
import { getManagedPage, getManagedContent } from "@/content/cms/java-cms-client";
import { managedOriginalVideoList, managedTutorialVideoList } from "@/features/jyg/managed-universe";

import { managedBlock, managedBlockStyle } from "@/content/cms/managed-page-style";

export function generateStaticParams() {
  return prototypeOriginalVideos.map((video) => ({ slug: video.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const slug = (await params).slug;
  const [originalItems, tutorialItems] = await Promise.all([getManagedContent("original-video", "zh-Hant", 100), getManagedContent("tutorial", "zh-Hant", 100)]);
  const managed = [...managedOriginalVideoList(originalItems), ...managedTutorialVideoList(tutorialItems)];
  const video = managed.find((item) => item.slug === slug) ?? findPrototypeOriginalVideo(slug);
  return video ? { title: `${video.title}｜AI原創影片`, description: video.description } : {};
}

export default async function OriginalVideoDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const [originalItems, tutorialItems] = await Promise.all([getManagedContent("original-video", "zh-Hant", 100), getManagedContent("tutorial", "zh-Hant", 100)]);
  const managed = [...managedOriginalVideoList(originalItems), ...managedTutorialVideoList(tutorialItems)];
  const video = managed.find((item) => item.slug === slug) ?? findPrototypeOriginalVideo(slug);
  if (!video) notFound();

  const backgroundPage = await getManagedPage("/video-player", "zh-Hant");
  const related = (managed.length ? managed : prototypeOriginalVideos).filter((item) => item.slug !== video.slug);

  return (
    <div className="jyg-prototype jyg-video-detail-page">
      <main className="jyg-video-detail-main" data-cms-zone="page-background" style={managedBlockStyle(managedBlock(backgroundPage, "page-background"))}>
        <section className="jyg-shell jyg-video-detail-intro" aria-labelledby="video-detail-title">
          <Link className="jyg-video-detail-back" href="/universe"><ChevronLeft aria-hidden />返回 AI 宇宙</Link>

          <div className="jyg-video-player-shell">{video.videoSrc ? <video controls playsInline preload="metadata" poster={video.posterSrc || undefined} aria-label={`播放${video.title}`}><source src={video.videoSrc} type="video/mp4" />您的瀏覽器不支援 MP4 影片播放。</video> : <div className="jyg-video-player-shell__empty"><MonitorPlay /><p>影片素材已由後台管理，上傳後即可播放。</p></div>}<span aria-hidden><MonitorPlay /></span></div>

          <div className="jyg-video-detail-heading">
            <div>
              <h1 id="video-detail-title">{video.title}</h1>
              <p>{video.description}</p>
            </div>
            <dl>
              <div><dt><Film aria-hidden />類型</dt><dd>{video.type}</dd></div>
              <div><dt><Clock3 aria-hidden />時長</dt><dd><VideoDuration seconds={video.durationSeconds} src={video.videoSrc} /></dd></div>
              <div><dt><Eye aria-hidden />觀看數</dt><dd>{video.views}</dd></div>
            </dl>
          </div>
        </section>

        {related.length > 0 && (
          <section className="jyg-shell jyg-video-related" aria-labelledby="video-related-title">
            <header><h2 id="video-related-title">繼續探索 AI 原創影片</h2></header>
            <div>
              {related.map((item) => (
                <Link href={`/universe/videos/${item.slug}`} key={item.slug}>
                  <span>{item.posterSrc ? <Image src={item.posterSrc} alt={item.posterAlt} fill sizes="(max-width: 700px) 100vw, 420px" unoptimized /> : item.videoSrc ? <video src={item.videoSrc} muted playsInline preload="metadata" aria-label={`${item.title}影片封面`} /> : null}</span>
                  <div><small>{item.type}</small><strong>{item.title}</strong><em>觀看影片 <ArrowRight aria-hidden /></em></div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
