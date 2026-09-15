export type V2ImageAsset = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

export const v2Assets = {
  logo: {
    src: "/cms-media/assets/v2/logo.png",
    alt: "My Dream",
    width: 245,
    height: 223,
  },
  backgrounds: {
    hero: { src: "/cms-media/assets/v2/hero-cinematic.webp", alt: "", width: 1672, height: 941 },
    creator: { src: "/cms-media/assets/v2/creator-stage.webp", alt: "", width: 1672, height: 941 },
    rewards: { src: "/cms-media/assets/v2/rewards.webp", alt: "", width: 1920, height: 1080 },
    news: { src: "/cms-media/assets/v2/news.webp", alt: "", width: 1920, height: 1080 },
    about: { src: "/cms-media/assets/v2/about.webp", alt: "", width: 1920, height: 1080 },
    download: { src: "/cms-media/assets/v2/download.webp", alt: "", width: 1920, height: 1080 },
    footer: { src: "/cms-media/assets/v2/footer.webp", alt: "", width: 1920, height: 620 },
    particles: { src: "/cms-media/assets/v2/particles.webp", alt: "", width: 1920, height: 1080 },
  },
  dramas: [
    { src: "/cms-media/assets/v2/drama-night-and-you.webp", alt: "《夜色與你》視覺示意海報", width: 720, height: 1080 },
    { src: "/cms-media/assets/v2/drama-song-mystery.webp", alt: "《大宋懸王》視覺示意海報", width: 720, height: 1080 },
    { src: "/cms-media/assets/v2/drama-rising-star.webp", alt: "《逆襲之星途璀璨》視覺示意海報", width: 720, height: 1080 },
    { src: "/cms-media/assets/v2/drama-forbidden-romance.webp", alt: "《別和小叔談戀愛》視覺示意海報", width: 720, height: 1080 },
    { src: "/cms-media/assets/v2/drama-three-needles.webp", alt: "《我以三針助你成皇》視覺示意海報", width: 720, height: 1080 },
    { src: "/cms-media/assets/v2/drama-reborn-heiress.webp", alt: "《重生後我成了豪門》視覺示意海報", width: 720, height: 1080 },
  ],
  news: [
    { src: "/cms-media/assets/v2/news-01.webp", alt: "My Dream 最新消息視覺示意封面一", width: 1200, height: 675 },
    { src: "/cms-media/assets/v2/news-02.webp", alt: "My Dream 最新消息視覺示意封面二", width: 1200, height: 675 },
    { src: "/cms-media/assets/v2/news-03.webp", alt: "My Dream 最新消息視覺示意封面三", width: 1200, height: 675 },
    { src: "/cms-media/assets/v2/news-04.webp", alt: "My Dream 最新消息視覺示意封面四", width: 1200, height: 675 },
  ],
} as const;
