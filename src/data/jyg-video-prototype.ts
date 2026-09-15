export type PrototypeOriginalVideo = {
  slug: string;
  title: string;
  type: string;
  description: string;
  publishedAt: string;
  views: string;
  duration: string;
  durationSeconds: number;
  resolution: string;
  videoSrc: string;
  posterSrc: string;
  posterAlt: string;
  productionMethod: string;
};

export const prototypeOriginalVideos: readonly PrototypeOriginalVideo[] = [
  {
    slug: "star-traveler",
    title: "《星之旅人》",
    type: "AI 原創動畫",
    description: "循著海岸與光的方向前進，一段關於旅程、記憶與重新出發的 AI 原創短片。",
    publishedAt: "2026/06",
    views: "待統計",
    duration: "00:15",
    durationSeconds: 15.09,
    resolution: "1280 × 720",
    videoSrc: "/cms-media/prototype/jyg/videos/star-traveler.mp4",
    posterSrc: "/cms-media/prototype/jyg/videos/star-traveler-poster.png",
    posterAlt: "《星之旅人》AI 原創動畫影片封面",
    productionMethod: "以 AI 影像生成建立場景與角色動態，再透過人工選鏡、節奏編排與後期整合完成本次 Prototype。",
  },
  {
    slug: "endless-realm",
    title: "《無盡之境》",
    type: "AI 科幻概念短片",
    description: "當機械樂團喚醒沉睡城市，聲音成為穿越未知世界的第一道訊號。",
    publishedAt: "2026/06",
    views: "待統計",
    duration: "00:08",
    durationSeconds: 8.45,
    resolution: "1280 × 720",
    videoSrc: "/cms-media/prototype/jyg/videos/endless-realm.mp4",
    posterSrc: "/cms-media/prototype/jyg/videos/endless-realm-poster.png",
    posterAlt: "《無盡之境》AI 科幻概念影片封面",
    productionMethod: "以 AI 概念影像生成未來舞台與機械角色，再透過人工剪輯、音樂節奏與畫面選擇完成本次 Prototype。",
  },
] as const;

export function findPrototypeOriginalVideo(slug: string) {
  return prototypeOriginalVideos.find((video) => video.slug === slug);
}
