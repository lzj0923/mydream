import {
  InternalHrefSchema,
  type Article,
  type Creator,
  type DownloadSettings,
  type Drama,
  type HomePage,
  type MediaAsset,
  type Site,
} from "@/content/types";
import { isPlaceholderMedia } from "@/content/validation";
import { v2Assets, type V2ImageAsset } from "@/data/v2-assets";

export const v2Navigation = [
  { id: "home", label: "首頁", href: "/", order: 0, visibility: "published", comingSoon: false },
  { id: "explore", label: "短劇預覽", href: "/explore", order: 1, visibility: "published", comingSoon: false },
  { id: "journal", label: "最新消息", href: "/journal", order: 2, visibility: "published", comingSoon: false },
  { id: "about", label: "關於我們", href: "/about", order: 3, visibility: "published", comingSoon: false },
  { id: "download", label: "下載 APP", href: "/download", order: 4, visibility: "published", comingSoon: true },
] as const;

export type V2Card = {
  href: string;
  title: string;
  meta: string;
  image: MediaAsset | V2ImageAsset;
  isDemo: boolean;
  licenseStatus: "cms-managed" | "replace-before-production";
};

export type V2CreatorCard = V2Card & { description: string };
export type V2ArticleCard = V2Card & { excerpt: string; publishedAt?: string };

function uniquePublished<T extends { id: string; publicationStatus: string }>(items: T[]) {
  return [...new Map(items.map((item) => [item.id, item])).values()]
    .filter((item) => item.publicationStatus === "published");
}

function selectedFirst<T extends { id: string; featured: boolean }>(items: T[], ids: string[], limit: number) {
  const byId = new Map(items.map((item) => [item.id, item]));
  const selected = ids.map((id) => byId.get(id)).filter((item): item is T => Boolean(item));
  const remaining = items.filter((item) => !ids.includes(item.id)).sort((a, b) => Number(b.featured) - Number(a.featured));
  return [...selected, ...remaining].slice(0, limit);
}

function live(home: HomePage, section: HomePage["hero"]) {
  return home.visibility === "published" && section.visibility === "published" ? section : undefined;
}

const taskDefaults: HomePage["rewardCards"] = [
  { icon: "check-in", title: "每日簽到", description: "開啟今日任務與參與進度。", statusLabel: "即將開放", actionLabel: "查看規則" },
  { icon: "watch", title: "觀看短劇", description: "從推薦內容探索下一段故事。", statusLabel: "APP 預覽", actionLabel: "前往短劇" },
  { icon: "invite", title: "邀請好友", description: "與朋友分享喜歡的短劇內容。", statusLabel: "規則準備中", actionLabel: "瞭解更多" },
];

const featureDefaults: HomePage["platformFeatures"] = [
  { icon: "library", title: "短劇預覽", description: "快速瀏覽精選短劇片段與內容資訊。" },
  { icon: "hd", title: "高畫質體驗", description: "為行動觀看設計的清晰沉浸體驗。" },
  { icon: "creator", title: "創作舞台", description: "讓原創故事與創作者被更多人看見。" },
  { icon: "reward", title: "任務獎勵", description: "參與互動並掌握 APP 任務進度。" },
  { icon: "shield", title: "安心使用", description: "平台規範、隱私與內容安全同步管理。" },
];

export function buildV2HomeModel({
  home,
  dramas,
  creators = [],
  articles,
  download,
  site,
}: {
  home: HomePage;
  dramas: Drama[];
  creators?: Creator[];
  articles: Article[];
  download: DownloadSettings;
  site?: Site;
}) {
  const publishedDramas = uniquePublished(dramas).filter((item) => !isPlaceholderMedia(item.poster));
  const publishedCreators = uniquePublished(creators).filter((item) => item.avatar && !isPlaceholderMedia(item.avatar));
  const publishedArticles = uniquePublished(articles).filter((item) => !isPlaceholderMedia(item.cover));
  const hero = live(home, home.hero);
  const popular = live(home, home.dramaDiscovery);
  const creator = live(home, home.creatorCenter);
  const rewards = live(home, home.rewards);
  const news = live(home, home.latestContent);
  const about = live(home, home.brandStatement);
  const platform = live(home, home.viewerCreator);
  const downloadCTA = live(home, home.downloadCTA);
  const heroHref = InternalHrefSchema.safeParse(hero?.ctaHref);

  return {
    sections: ["hero", "popular-dramas", "app-features", "creator-stage", "rewards", "download", "latest-news", "about"] as const,
    hero: {
      eyebrow: hero?.title ? "MY DREAM · SHORT DRAMA" : "熱門短劇 · 精彩內容",
      title: hero?.title ?? "每一次滑動，",
      subtitle: hero?.subtitle ?? "都有一段新故事",
      description: hero?.description ?? "熱門短劇、精彩內容，隨時開啟你的短劇世界。",
      ctaLabel: hero?.ctaLabel ?? "立即下載 APP",
      ctaHref: heroHref.success ? heroHref.data : "/download",
      background: hero?.media ?? v2Assets.backgrounds.hero,
      device: home.heroDevice ?? { src: "/cms-media/app/home-feed-device.webp", alt: "My Dream APP 首頁裝置預覽", width: 900, height: 1600 },
    },
    popularDramas: {
      eyebrow: "TRENDING NOW",
      title: popular?.title ?? "熱門短劇推薦",
      description: popular?.description ?? "精選近期熱門內容，從片單快速找到想追的故事。",
    },
    immersive: {
      eyebrow: "IMMERSIVE EXPERIENCE",
      title: "滑動探索下一段故事",
      description: "My Dream APP 的內容探索體驗預覽。",
    },
    creator: {
      eyebrow: "CREATOR SPOTLIGHT",
      title: creator?.title ?? "創作者精選",
      description: creator?.description ?? "看見正在發生的創作，也認識故事背後的人。",
    },
    rewards: {
      eyebrow: "MISSION & REWARDS",
      title: rewards?.title ?? "任務獎勵亮點",
      description: rewards?.description ?? "每日參與、觀看與分享，掌握未來 APP 任務體驗。",
      note: "實際任務規則、點數與獎勵以 APP 正式上線內容為準。",
      cards: home.rewardCards.length ? home.rewardCards : taskDefaults,
    },
    features: {
      eyebrow: "APP FEATURES",
      title: platform?.title ?? "APP 特色亮點",
      description: platform?.description ?? "從內容探索到創作互動，一個平台串起觀看與分享。",
      items: home.platformFeatures.length ? home.platformFeatures : featureDefaults,
    },
    news: {
      eyebrow: "LATEST NEWS",
      title: news?.title ?? "最新消息",
      description: news?.description ?? "平台公告、短劇推薦與創作者資訊。",
    },
    about: {
      eyebrow: "ABOUT MY DREAM",
      title: about?.title ?? "關於 My Dream",
      description: about?.description ?? site?.defaultSeo.description ?? "連結短劇內容、創作者與每一位喜歡故事的人。",
      image: about?.media ?? v2Assets.backgrounds.about,
    },
    download: {
      eyebrow: "MY DREAM APP",
      title: downloadCTA?.title ?? "立即下載 My Dream APP",
      description: downloadCTA?.description ?? "精彩短劇，隨手可得。",
      device: home.downloadDevice ?? { src: "/cms-media/app/home-feed-device.webp", alt: "My Dream APP 裝置預覽", width: 900, height: 1600 },
      ios: download.ios,
      googlePlay: download.googlePlay,
      android: download.android,
      qrCode: download.qrCode,
      qrCodeStatus: download.qrCodeStatus,
    },
    dramas: selectedFirst(publishedDramas, home.featuredDramaIds, 6).map((item) => ({
      href: `/drama/${item.slug}`,
      title: item.title,
      meta: [item.categories[0], item.episodes ? `共 ${item.episodes} 集` : undefined].filter(Boolean).join(" · "),
      image: item.poster,
      isDemo: false,
      licenseStatus: "cms-managed" as const,
    })),
    creators: selectedFirst(publishedCreators, home.featuredCreatorIds, 4).map((item) => ({
      href: `/creator#${item.slug}`,
      title: item.displayName,
      meta: item.featured ? "精選創作者" : "My Dream 創作者",
      description: item.bio,
      image: item.avatar!,
      isDemo: false,
      licenseStatus: "cms-managed" as const,
    })),
    articles: selectedFirst(publishedArticles, home.featuredArticleIds, 4).map((item) => ({
      href: `/journal/${item.slug}`,
      title: item.title,
      meta: item.category,
      excerpt: item.excerpt,
      publishedAt: item.publishedAt,
      image: item.cover,
      isDemo: false,
      licenseStatus: "cms-managed" as const,
    })),
    stats: {
      dramas: publishedDramas.length,
      creators: publishedCreators.length,
      articles: publishedArticles.length,
    },
  };
}

export type V2HomeModel = ReturnType<typeof buildV2HomeModel>;
export type V2FooterDetail = { label: string; value: string; href?: string };

export function buildV2FooterDetails(site: Site): V2FooterDetail[] {
  return [
    site.company?.email ? { label: "公司信箱", value: site.company.email, href: `mailto:${site.company.email}` } : undefined,
    site.supportEmail ? { label: "客服信箱", value: site.supportEmail, href: `mailto:${site.supportEmail}` } : undefined,
    site.businessEmail ? { label: "商務信箱", value: site.businessEmail, href: `mailto:${site.businessEmail}` } : undefined,
    site.company?.phone ? { label: "公司電話", value: site.company.phone, href: `tel:${site.company.phone}` } : undefined,
    site.company?.address ? { label: "公司地址", value: site.company.address } : undefined,
  ].filter((item): item is V2FooterDetail => Boolean(item));
}
