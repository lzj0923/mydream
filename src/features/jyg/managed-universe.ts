import type { CmsContent } from "@/content/cms/java-cms-client";

export type ManagedOriginalVideo = {
  slug: string;
  title: string;
  description: string;
  posterSrc: string;
  posterAlt: string;
  videoSrc: string;
  type: string;
  duration: string;
  durationSeconds: number;
  views: string;
  publishedAt: string;
  productionMethod: string;
  resolution: string;
};

const text = (value: unknown, fallback = "") => typeof value === "string" && value.trim() ? value.trim() : fallback;

export function managedOriginalVideo(item: CmsContent): ManagedOriginalVideo | null {
  if (item.type !== "original-video" || item.data.visible === false) return null;
  const videoSrc = text(item.data.videoUrl);
  if (!item.coverUrl && !videoSrc) return null;
  return {
    slug: item.slug,
    title: item.title,
    description: text(item.summary, "探索 AI 原創角色、概念場景與動態敘事。"),
    // An empty poster lets the browser render the video's first decoded frame.
    posterSrc: text(item.coverUrl),
    posterAlt: text(item.data.posterAlt, `${item.title} AI 原創影片封面`),
    videoSrc,
    type: text(item.data.contentLabel, "AI 原創影片"),
    duration: text(item.data.duration, "完整內容"),
    durationSeconds: Number(item.data.durationSeconds) || 0,
    views: text(item.data.views, "待統計"),
    publishedAt: text(item.data.publishedAt, "即將上架"),
    productionMethod: text(item.data.productionMethod, "以 AI 角色、場景與聲音設計共同完成。"),
    resolution: text(item.data.resolution, "依影片素材設定"),
  };
}

export function managedOriginalVideoList(items: CmsContent[] | null | undefined) {
  return (items ?? []).map(managedOriginalVideo).filter((item): item is ManagedOriginalVideo => Boolean(item));
}

export function managedTutorialVideo(item: CmsContent): ManagedOriginalVideo | null {
  if (item.type !== "tutorial" || item.data.visible === false) return null;
  const videoSrc = text(item.data.videoUrl);
  return {
    slug: item.slug,
    title: item.title,
    description: text(item.summary, "學習 AI 工具與創作流程。"),
    posterSrc: text(item.coverUrl) || (videoSrc ? "" : "/cms-media/prototype/jyg/ip-worlds.webp"),
    posterAlt: text(item.data.posterAlt, `${item.title} AI 教學影片封面`),
    videoSrc,
    type: text(item.data.contentLabel, "AI 教學影片"),
    duration: text(item.data.duration, "完整內容"),
    durationSeconds: Number(item.data.durationSeconds) || 0,
    views: text(item.data.views, "待統計"),
    publishedAt: text(item.data.publishedAt, "即將上架"),
    productionMethod: text(item.data.productionMethod, "以 AI 工具示範與實作教學完成。"),
    resolution: text(item.data.resolution, "依影片素材設定"),
  };
}

export function managedTutorialVideoList(items: CmsContent[] | null | undefined) {
  return (items ?? []).map(managedTutorialVideo).filter((item): item is ManagedOriginalVideo => Boolean(item));
}
