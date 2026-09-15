import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  Clapperboard,
  Flame,
  ListVideo,
  Play,
} from "lucide-react";
import { notFound } from "next/navigation";

import { JygSectionHeading } from "@/components/prototype/jyg-prototype";
import { EpisodeDownloadGate } from "@/components/prototype/episode-download-gate";
import { getManagedContent, getManagedPage, type CmsContent } from "@/content/cms/java-cms-client";
import { managedBlock, managedBlockStyle } from "@/content/cms/managed-page-style";
import {
  prototypeHomeDramas,
  prototypeWorks,
  type PrototypeImage,
} from "@/data/jyg-prototype";

type WorkDetail = {
  slug: string;
  title: string;
  type: string;
  genre: string;
  episodeLabel: string;
  description: string;
  popularity: string;
  image: PrototypeImage;
  episodes: readonly WorkEpisode[];
  freeEpisodeCount: number;
  showAllEpisodes: boolean;
  managed?: boolean;
};

type WorkEpisode = {
  label: string;
  title: string;
  videoSrc?: string;
  coverSrc?: string;
  episodeNumber?: number;
};

const episodeTitles = ["序章：世界開始改變", "角色進入故事核心", "命運第一次轉向"] as const;
const prototypeEpisodes: readonly WorkEpisode[] = episodeTitles.map((title, index) => ({
  label: `EP${String(index + 1).padStart(2, "0")}`,
  title,
}));

function findWorkDetail(slug: string): WorkDetail | undefined {
  const drama = prototypeHomeDramas.find((item) => item.slug === slug);
  if (drama) {
    return {
      slug: drama.slug,
      title: drama.title,
      type: drama.format,
      genre: drama.genre,
      episodeLabel: drama.episodeLabel,
      description: drama.description,
      popularity: drama.heat,
      image: drama.image,
      episodes: drama.episodes ?? prototypeEpisodes,
       freeEpisodeCount: 3,
      showAllEpisodes: true,
    };
  }

  const work = prototypeWorks.find((item) => item.slug === slug);
  if (!work) return undefined;
  return {
    slug: work.slug,
    title: work.title,
    type: work.type,
    genre: work.ipName,
    episodeLabel: "Prototype · 3 EP",
    description: work.description,
    popularity: "8.8",
    image: work.image,
    episodes: prototypeEpisodes,
     freeEpisodeCount: 3,
    showAllEpisodes: true,
  };
}

function contentText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function contentGenre(value: unknown, fallback = "原創") {
  const genres = Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : typeof value === "string" ? value.split(/[、,，]/).map((item) => item.trim()).filter(Boolean) : [];
  return genres.length ? [...new Set(genres)].join(" · ") : fallback;
}

function contentNumber(value: unknown, fallback: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function managedWorkDetail(work: CmsContent, episodes: CmsContent[]): WorkDetail {
  const relatedEpisodes = episodes
    .filter((episode) => episode.data.visible !== false && episode.data.workSlug === work.slug)
    .map((episode, index) => {
      const episodeNumber = contentNumber(episode.data.episodeNumber, index + 1);
      return {
        label: contentText(episode.data.episodeLabel, `EP${String(episodeNumber).padStart(2, "0")}`),
        title: episode.title,
        videoSrc: contentText(episode.data.videoUrl) || undefined,
        coverSrc: episode.coverUrl,
        episodeNumber,
      };
    })
    .sort((left, right) => (left.episodeNumber ?? 0) - (right.episodeNumber ?? 0));
  const imageSrc = work.coverUrl || contentText(work.data.imageUrl, "/cms-media/assets/v2/drama-night-and-you.webp");

  return {
    slug: work.slug,
    title: work.title,
    type: contentText(work.data.format, "AI 原創作品"),
    genre: contentGenre(work.data.genre, "原創"),
    episodeLabel: relatedEpisodes.length ? `連載中 · ${relatedEpisodes.length} 集` : contentText(work.data.episodeLabel, "內容籌備中"),
    description: work.summary || "內容持續更新中。",
    popularity: contentText(work.data.heat, "NEW"),
    image: {
      src: imageSrc,
      alt: contentText(work.data.imageAlt, `《${work.title}》作品封面`),
      position: contentText(work.data.imagePosition, "center top"),
    },
    episodes: relatedEpisodes,
    freeEpisodeCount: contentNumber(work.data.freeEpisodeCount, 3),
    showAllEpisodes: work.data.showAllEpisodes !== false,
    managed: true,
  };
}

async function resolveWorkDetail(slug: string) {
  const [works, episodes] = await Promise.all([
    getManagedContent("work", "zh-Hant", 200),
    getManagedContent("episode", "zh-Hant", 500, slug),
  ]);
  const managedWork = works?.find((work) => work.slug === slug && work.data.visible !== false);
  return managedWork ? managedWorkDetail(managedWork, episodes ?? []) : findWorkDetail(slug);
}

export function generateStaticParams() {
  return [...prototypeHomeDramas, ...prototypeWorks].map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const item = await resolveWorkDetail((await params).slug);
  return item ? { title: item.title, description: item.description } : {};
}

export default async function WorkDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ episode?: string | string[] }>;
}) {
  const [{ slug }, downloadPage, backgroundPage] = await Promise.all([params, getManagedPage("/download", "zh-Hant"), getManagedPage("/episode-player", "zh-Hant")]);
  const item = await resolveWorkDetail(slug);
  if (!item) notFound();

  const episodeParam = (await searchParams).episode;
  const requestedEpisode = Number(Array.isArray(episodeParam) ? episodeParam[0] : episodeParam);
  const requestedEpisodeIndex = Number.isInteger(requestedEpisode)
    ? item.episodes.findIndex((episode, index) => (episode.episodeNumber ?? index + 1) === requestedEpisode)
    : -1;
  const selectedEpisodeIndex = requestedEpisodeIndex;
  const selectedEpisode = item.episodes[selectedEpisodeIndex];
  const selectedEpisodeNumber = selectedEpisode?.episodeNumber ?? selectedEpisodeIndex + 1;
  const selectedEpisodeLocked = Boolean(selectedEpisode && selectedEpisodeNumber > item.freeEpisodeCount);
  const firstEpisodeNumber = item.episodes[0]?.episodeNumber ?? 1;
  const downloadProps = downloadPage?.blocks.find((block) => block.zone === "store-status")?.props ?? {};
  const androidQrUrl = contentText(downloadProps.androidQrUrl) || undefined;
  const iosQrUrl = contentText(downloadProps.iosQrUrl) || undefined;
  const displayEpisodes = item.showAllEpisodes ? item.episodes : item.episodes.slice(0, item.freeEpisodeCount);

  return (
    <div className="jyg-prototype jyg-work-detail-page">
      <section className="jyg-work-detail-hero">
        <Image className="jyg-work-detail-hero__backdrop" src={item.image.src} alt="" fill priority loading="eager" sizes="100vw" unoptimized />
        <span className="jyg-work-detail-hero__veil" />
        <div className="jyg-shell jyg-work-detail-hero__grid">
          <figure className="jyg-work-detail-cover">
            <Image src={item.image.src} alt={item.image.alt} fill priority loading="eager" sizes="(max-width: 700px) 48vw, 340px" style={{ objectPosition: item.image.position }} unoptimized />
          </figure>
          <div className="jyg-work-detail-copy">
            <h1>{item.title}</h1>
            <div className="jyg-work-detail-meta">
              <span><Clapperboard aria-hidden />{item.type}</span>
              <span><ListVideo aria-hidden />{item.episodeLabel}</span>
              <span><Flame fill="currentColor" aria-hidden />熱度 {item.popularity}</span>
            </div>
                <p>{item.description}</p>
            <div className="jyg-work-detail-actions">
              <Link href={`/works/${item.slug}?episode=${firstEpisodeNumber}#video-player`} className="jyg-button jyg-button--gold"><Play fill="currentColor" aria-hidden />播放正片</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="jyg-section jyg-work-episodes" id="episodes" data-cms-zone="page-background" style={managedBlockStyle(managedBlock(backgroundPage, "page-background"))}>
        <div className="jyg-shell">
          <JygSectionHeading
            eyebrow="EPISODE LIST"
            title="選集"
            description="選擇集數觀看"
          />
          {selectedEpisodeLocked && selectedEpisode ? <EpisodeDownloadGate episodeLabel={`第${selectedEpisodeNumber}集`} episodeTitle={selectedEpisode.title} freeEpisodeCount={item.freeEpisodeCount} androidQrUrl={androidQrUrl} iosQrUrl={iosQrUrl} /> : selectedEpisode?.videoSrc ? (
            <div className="jyg-work-episode-player" id="video-player">
              <header>
                 <div><span>{`第${selectedEpisodeNumber}集`}</span><h2>{item.title} · {selectedEpisode.title}</h2></div>
              </header>
              <video key={selectedEpisode.videoSrc} controls autoPlay playsInline preload="metadata" poster={selectedEpisode.coverSrc || undefined}>
                <source src={selectedEpisode.videoSrc} type="video/mp4" />
                您的瀏覽器不支援 MP4 影片播放。
              </video>
            </div>
          ) : selectedEpisode ? (
            <div className="jyg-work-episode-placeholder" id="video-player">
              <Image src={item.image.src} alt="" fill sizes="(max-width: 900px) 100vw, 820px" unoptimized />
              <span className="jyg-work-episode-placeholder__veil" />
              <div><Play fill="currentColor" aria-hidden /><strong>本集視頻準備中</strong><small>視頻內容即將上線</small></div>
            </div>
          ) : <span className="sr-only">請選擇一集開始播放</span>}
          <div className="jyg-episode-grid jyg-episode-grid--compact">
            {displayEpisodes.map((episode, index) => {
                  const episodeNumber = episode.episodeNumber ?? index + 1;
                  const episodeDisplayLabel = String(episodeNumber);
                  const episodeClassName = `${episodeNumber <= item.freeEpisodeCount ? "is-free" : ""}${selectedEpisodeIndex === index ? " is-active" : ""}`.trim();
                  return episodeNumber > item.freeEpisodeCount ? <EpisodeDownloadGate key={episode.label} episodeLabel={episodeDisplayLabel} episodeTitle={episode.title} freeEpisodeCount={item.freeEpisodeCount} androidQrUrl={androidQrUrl} iosQrUrl={iosQrUrl} /> : (
                    <Link className={episodeClassName || undefined} href={`/works/${item.slug}?episode=${episodeNumber}#${episode.videoSrc ? "video-player" : "episodes"}`} key={episode.label}>
                  <span>{episodeDisplayLabel}</span>
                  <strong>{episode.title}</strong>
                  <small>{episode.videoSrc ? "播放本集" : index === 0 ? "立即開始" : "繼續探索"}</small>
                  <Play fill="currentColor" aria-hidden />
                </Link>
              );
            })}
            {item.episodes.length === 0 ? <p>本作品尚未上架劇集。</p> : null}
          </div>
        </div>
      </section>

    </div>
  );
}
