export type ImageAsset = {
  src: string;
  alt: string;
  width: number;
  height: number;
  available: boolean;
  includesDeviceFrame?: boolean;
  isPlaceholder?: boolean;
};

export type VideoAsset = { src: string; poster: string; available: boolean; isPlaceholder?: boolean };

/** Single source of truth for supplied My Dream media. */
export const mediaAssets = {
  logo: { src: "/cms-media/brand/logo-transparent.png", alt: "MD / MY DREAM 官方 Logo", width: 262, height: 245, available: true },
  logoPng: { src: "/cms-media/brand/logo-transparent.png", alt: "MD / MY DREAM 官方 Logo PNG", width: 262, height: 245, available: true },
  app: {
    home: { src: "/cms-media/app/home-feed-device.webp", alt: "My Dream 首頁 Creator Feed 畫面", width: 360, height: 720, available: true, includesDeviceFrame: true },
    search: { src: "/cms-media/app/search-device.webp", alt: "My Dream 搜尋畫面", width: 360, height: 720, available: true, includesDeviceFrame: true },
    overview: { src: "/cms-media/app/app-overview.webp", alt: "My Dream APP 功能總覽", width: 555, height: 920, available: true },
    dramaLibrary: { src: "/cms-media/app/derived/drama-library-derived.webp", alt: "My Dream 短劇片庫畫面", width: 300, height: 620, available: true, includesDeviceFrame: true },
    creator: { src: "/cms-media/app/derived/creator-center-derived.webp", alt: "My Dream 創作者中心畫面", width: 204, height: 454, available: true, includesDeviceFrame: true },
    rewards: { src: "/cms-media/app/derived/rewards-derived.webp", alt: "My Dream 任務獎勵畫面", width: 220, height: 470, available: true, includesDeviceFrame: true },
    profile: { src: "/cms-media/app/derived/profile-derived.webp", alt: "My Dream 內容互動畫面", width: 130, height: 280, available: true, includesDeviceFrame: false },
  },
  video: {
    logoIntro: { src: "/cms-media/video/logo-intro-h264.mp4", poster: "/cms-media/video/logo-intro-poster.jpg", available: true },
    dramaPromo: { src: "/cms-media/video/drama-promo-h264.mp4", poster: "/cms-media/video/drama-promo-poster.jpg", available: true },
    appFeaturesReference: { src: "/cms-media/video/app-features-reference-h264.mp4", poster: "/cms-media/video/drama-promo-poster.jpg", available: true },
    dramaFeature: { src: "/cms-media/video/clips/drama-feature-14-35s.mp4", poster: "/cms-media/video/drama-promo-poster.jpg", available: true },
    creatorFeature: { src: "/cms-media/video/clips/creator-feature-39-49s.mp4", poster: "/cms-media/video/drama-promo-poster.jpg", available: true },
    rewardsFeature: { src: "/cms-media/video/clips/rewards-feature-53-65s.mp4", poster: "/cms-media/video/drama-promo-poster.jpg", available: true },
  },
} as const;
