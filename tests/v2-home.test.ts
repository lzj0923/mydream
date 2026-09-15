import { navigationHeroProps } from "../src/content/cms/navigation-hero.ts";
import { publicNavigation } from "../src/lib/navigation/public-items.ts";
import { backgroundSettingsPath, defaultBackgroundBlocks } from "../src/content/cms/background-page-settings.ts";
import { managedBlockStyle } from "../src/content/cms/managed-page-style.ts";
import assert from "node:assert/strict";
import test from "node:test";

import {
  buildV2FooterDetails,
  buildV2HomeModel,
  v2Navigation,
} from "@/features/v2/home-model";
import {
  buildJygHomeHeroModel,
  jygHomeHeroFallback,
} from "@/features/jyg/home-hero-model";
import {
  buildJygFeaturedWorksModel,
  buildJygAllWorksModel,
  workHeatValue,
  jygFeaturedWorksFallback,
} from "@/features/jyg/home-featured-works-model";
import type { Article, DownloadSettings, Drama, HomePage, Site } from "@/content/types";
import type { CmsContent, CmsPage } from "@/content/cms/java-cms-client";
import { resolveFocusTrapDestination, shouldCloseDrawerForViewport } from "@/lib/navigation/focus-trap";

const home: HomePage = {
  id: "home",
  hero: {
    title: "CMS Hero",
    subtitle: "CMS Subtitle",
    description: "CMS description",
    ctaLabel: "CMS CTA",
    ctaHref: "/download",
    visibility: "published",
  },
  brandStatement: { visibility: "published" },
  viewerCreator: { visibility: "published" },
  dramaDiscovery: { title: "CMS 熱門短劇", visibility: "published" },
  creatorCenter: { title: "CMS 創作者舞台", visibility: "published" },
  creatorFeed: { visibility: "published" },
  rewards: { title: "CMS 任務獎勵", visibility: "published" },
  rewardCards: [],
  platformFeatures: [],
  profile: { visibility: "published" },
  latestContent: { title: "CMS 最新消息", visibility: "published" },
  journal: { visibility: "published" },
  downloadCTA: { title: "CMS 下載標題", visibility: "published" },
  featuredDramaIds: [],
  featuredCreatorIds: [],
  featuredArticleIds: [],
  visibility: "published",
};

const download: DownloadSettings = {
  id: "download-settings",
  ios: { availability: "coming-soon" },
  googlePlay: { availability: "coming-soon" },
  android: { availability: "coming-soon" },
  qrCodeStatus: "coming-soon",
  deepLinkStatus: "coming-soon",
};

const drama: Drama = {
  id: "cms-drama",
  slug: "cms-drama",
  title: "CMS 正式短劇",
  synopsis: "CMS 正式短劇簡介",
  categoryIds: ["romance"],
  categories: ["愛情"],
  tags: ["熱播"],
  poster: { src: "/media/cms-drama.webp", alt: "CMS 正式短劇海報", isPlaceholder: false },
  episodes: 24,
  availability: "available",
  featured: true,
  publicationStatus: "published",
};

const article: Article = {
  id: "cms-article",
  slug: "cms-article",
  title: "CMS 正式消息",
  excerpt: "CMS 正式消息摘要",
  categoryId: "platform",
  category: "平台消息",
  cover: { src: "/media/cms-news.webp", alt: "CMS 正式消息封面", isPlaceholder: false },
  author: "CMS 編輯部",
  publishedAt: "2026-08-01",
  body: ["CMS 正式消息內容"],
  featured: true,
  publicationStatus: "published",
};

const managedHomePage: CmsPage = {
  id: "managed-home",
  path: "/",
  key: "home",
  locale: "zh-Hant",
  title: "首页",
  seo: {},
  blocks: [{
    id: "managed-hero",
    type: "hero",
    schemaVersion: 1,
    zone: "main",
    order: 0,
    props: { eyebrow: "MANAGED", title: "后台主标题", subtitle: "后台副标题", description: "后台说明", backgroundUrl: "/managed.webp", backgroundAlt: "后台背景" },
    style: { titleColor: "#123456", titleFontSize: 60 },
  }],
};

test("V2 home maps approved CMS copy into the required scroll narrative", () => {
  const model = buildV2HomeModel({ home, dramas: [drama], articles: [article], download });

  assert.deepEqual(model.sections, ["hero", "popular-dramas", "app-features", "creator-stage", "rewards", "download", "latest-news", "about"]);
  assert.equal(model.hero.title, "CMS Hero");
  assert.equal(model.hero.subtitle, "CMS Subtitle");
  assert.equal(model.popularDramas.title, "CMS 熱門短劇");
  assert.equal(model.creator.title, "CMS 創作者舞台");
  assert.equal(model.rewards.title, "CMS 任務獎勵");
  assert.equal(model.news.title, "CMS 最新消息");
  assert.equal(model.download.title, "CMS 下載標題");
});

test("home Hero maps complete local content through its view model", () => {
  const localHome: HomePage = {
    ...home,
    hero: {
      ...home.hero,
      eyebrow: "LOCAL EYEBROW",
      title: "本地第一行",
      subtitle: "本地第二行",
      description: "本地 Hero 描述",
      ctaLabel: "探索本地宇宙",
      ctaHref: "/universe",
      secondaryCtaLabel: "觀看本地作品",
      secondaryCtaHref: "/works",
      media: {
        src: "/assets/jyg/ai-universe-hero-v2.webp",
        alt: "本地 Hero 背景",
        width: 1920,
        height: 1080,
        isPlaceholder: false,
      },
    },
  };

  assert.deepEqual(buildJygHomeHeroModel(localHome), {
    eyebrow: "LOCAL EYEBROW",
    title: "本地第一行",
    subtitle: "本地第二行",
    description: "本地 Hero 描述",
    primaryCta: { label: "探索本地宇宙", href: "/universe" },
    secondaryCta: { label: "觀看本地作品", href: "/works" },
    background: {
      src: "/assets/jyg/ai-universe-hero-v2.webp",
      alt: "本地 Hero 背景",
      width: 1920,
      height: 1080,
      isPlaceholder: false,
    },
    backgroundVideo: undefined,
  });
});

test("fixed home layout prefers Java CMS text and style overrides", () => {
  const model = buildJygHomeHeroModel(home, managedHomePage);
  assert.equal(model.title, "后台主标题");
  assert.equal(model.subtitle, "后台副标题");
  assert.equal(model.background.src, "/managed.webp");
  assert.equal(model.style?.titleColor, "#123456");
  assert.equal(model.style?.titleFontSize, 60);
});

test("managed work cards support visibility, ordering data and media covers", () => {
  const managedWorks: CmsContent[] = [{
    id: "work-1", type: "work", slug: "managed-work", locale: "zh-Hant", title: "后台作品", summary: "后台简介", coverUrl: "http://localhost:8080/media/cover.webp", featured: true, sortWeight: 99,
    data: { format: "AI動畫", genre: "科幻", episodeLabel: "全 10 集", heat: "9.9", href: "/works/managed-work", isNew: true, visible: true },
  }, {
    id: "work-2", type: "work", slug: "hidden-work", locale: "zh-Hant", title: "已下架作品", featured: true, sortWeight: 98,
    data: { visible: false },
  }];
  const model = buildJygFeaturedWorksModel({ home, dramas: [], managedWorks });
  assert.equal(model.source, "cms");
  assert.equal(model.items.length, 1);
  assert.equal(model.items[0].title, "后台作品");
  assert.equal(model.items[0].image.src, "http://localhost:8080/media/cover.webp");
  assert.equal(model.items[0].isNew, true);
});

test("home Hero keeps the approved Prototype fallback when local content is absent or incomplete", () => {
  assert.deepEqual(buildJygHomeHeroModel(), jygHomeHeroFallback);
  assert.deepEqual(
    buildJygHomeHeroModel({ ...home, hero: { ...home.hero, eyebrow: "本地資料", media: undefined } }),
    jygHomeHeroFallback,
  );
  assert.deepEqual(
    buildJygHomeHeroModel({ ...home, hero: { ...home.hero, visibility: "draft" } }),
    jygHomeHeroFallback,
  );
});

test("Phase 5 featured works preserve CMS relationship order and exclude drafts or placeholder covers", () => {
  const first = {
    ...drama,
    id: "first",
    slug: "first-work",
    title: "第一部 CMS 作品",
    tags: ["AI漫劇"],
    categories: ["都市"],
    episodes: 18,
    ranking: 2,
  };
  const second = {
    ...drama,
    id: "second",
    slug: "second-work",
    title: "第二部 CMS 作品",
    tags: ["AI動畫"],
    categories: ["科幻"],
    episodes: 12,
    ranking: 1,
  };
  const draft = { ...drama, id: "draft", slug: "draft-work", publicationStatus: "draft" as const };
  const placeholder = {
    ...drama,
    id: "placeholder-work",
    slug: "placeholder-work",
    poster: { ...drama.poster, isPlaceholder: true },
  };
  const model = buildJygFeaturedWorksModel({
    home: { ...home, featuredDramaIds: ["second", "draft", "placeholder-work", "first"] },
    dramas: [first, draft, placeholder, second],
  });

  assert.equal(model.source, "cms");
  assert.deepEqual(model.items.map((item) => item.slug), ["second-work", "first-work"]);
  assert.deepEqual(model.items[0], {
    slug: "second-work",
    href: "/drama/second-work",
    title: "第二部 CMS 作品",
    format: "AI動畫",
    genre: "科幻",
    episodeLabel: "全 12 集",
    description: "CMS 正式短劇簡介",
    heat: "TOP 1",
    image: drama.poster,
  });
});

test("Phase 5 featured works use the Prototype fallback when CMS has no valid selection", () => {
  assert.deepEqual(
    buildJygFeaturedWorksModel({ home: { ...home, featuredDramaIds: [] }, dramas: [drama] }),
    jygFeaturedWorksFallback,
  );
  assert.deepEqual(
    buildJygFeaturedWorksModel({
      home: { ...home, featuredDramaIds: ["draft"] },
      dramas: [{ ...drama, id: "draft", publicationStatus: "draft" }],
    }),
    jygFeaturedWorksFallback,
  );
});

test("Phase 5 featured works enforce the 12 item public limit", () => {
  const dramas = Array.from({ length: 13 }, (_, index) => ({
    ...drama,
    id: `work-${index}`,
    slug: `work-${index}`,
    title: `CMS 作品 ${index}`,
  }));
  const model = buildJygFeaturedWorksModel({
    home: { ...home, featuredDramaIds: dramas.map((item) => item.id) },
    dramas,
  });

  assert.equal(model.source, "cms");
  assert.equal(model.items.length, 12);
});

test("V2 home ignores disabled CMS sections instead of publishing their copy", () => {
  const model = buildV2HomeModel({
    home: {
      ...home,
      hero: { ...home.hero, title: "不應出現的停用 Hero", visibility: "draft" },
      downloadCTA: { ...home.downloadCTA, title: "不應出現的停用下載區", visibility: "draft" },
    },
    dramas: [],
    articles: [],
    download,
  });

  assert.equal(model.hero.title, "每一次滑動，");
  assert.equal(model.download.title, "立即下載 My Dream APP");
});

test("V2 home prefers published CMS cards and does not mislabel them as demo assets", () => {
  const model = buildV2HomeModel({ home, dramas: [drama], articles: [article], download });

  assert.deepEqual(model.dramas[0], {
    href: "/drama/cms-drama",
    title: "CMS 正式短劇",
    meta: "愛情 · 共 24 集",
    image: { src: "/media/cms-drama.webp", alt: "CMS 正式短劇海報", isPlaceholder: false },
    isDemo: false,
    licenseStatus: "cms-managed",
  });
  assert.equal(model.articles[0].href, "/journal/cms-article");
  assert.equal(model.articles[0].isDemo, false);
  assert.equal(model.articles[0].licenseStatus, "cms-managed");
});

test("V2 home prioritizes featured, non-placeholder CMS content deterministically", () => {
  const nonFeaturedDrama = { ...drama, id: "ordinary", slug: "ordinary", title: "一般短劇", featured: false };
  const placeholderDrama = { ...drama, id: "placeholder", slug: "placeholder", title: "佔位短劇", featured: true, poster: { ...drama.poster, isPlaceholder: true } };
  const nonFeaturedArticle = { ...article, id: "ordinary-article", slug: "ordinary-article", title: "一般消息", featured: false };
  const placeholderArticle = { ...article, id: "placeholder-article", slug: "placeholder-article", title: "佔位消息", featured: true, cover: { ...article.cover, isPlaceholder: true } };
  const model = buildV2HomeModel({
    home,
    dramas: [nonFeaturedDrama, placeholderDrama, drama, drama],
    articles: [nonFeaturedArticle, placeholderArticle, article, article],
    download,
  });

  assert.equal(model.dramas[0].title, "CMS 正式短劇");
  assert.equal(model.dramas.filter((item) => item.title === "CMS 正式短劇").length, 1);
  assert.equal(model.dramas.some((item) => item.title === "佔位短劇"), false);
  assert.equal(model.articles[0].title, "CMS 正式消息");
  assert.equal(model.articles.filter((item) => item.title === "CMS 正式消息").length, 1);
  assert.equal(model.articles.some((item) => item.title === "佔位消息"), false);
});

test("V2 home does not invent CMS collection records when collections are empty", () => {
  const model = buildV2HomeModel({ home, dramas: [], articles: [], download });

  assert.equal(model.dramas.length, 0);
  assert.equal(model.articles.length, 0);
});

test("V2 navigation exposes only unique, safe internal destinations", () => {
  const hrefs = v2Navigation.map((item) => item.href);

  assert.equal(new Set(hrefs).size, hrefs.length);
  assert.ok(hrefs.every((href) => href.startsWith("/") && !href.startsWith("//")));
  assert.deepEqual(hrefs, ["/", "/explore", "/journal", "/about", "/download"]);
});

test("V2 footer never invents official company contact details", () => {
  const baseSite: Site = {
    id: "site",
    name: "My Dream",
    locale: "zh-Hant",
    siteUrl: "https://mydream.example.com",
    defaultSeo: { noIndex: false },
    socialLinks: {},
  };

  assert.deepEqual(buildV2FooterDetails(baseSite), []);
  assert.deepEqual(buildV2FooterDetails({
    ...baseSite,
    company: { email: "hello@example.com", address: "CMS 核定地址" },
    supportEmail: "support@example.com",
  }), [
    { label: "公司信箱", value: "hello@example.com", href: "mailto:hello@example.com" },
    { label: "客服信箱", value: "support@example.com", href: "mailto:support@example.com" },
    { label: "公司地址", value: "CMS 核定地址" },
  ]);
});

test("mobile drawer focus wraps only at keyboard boundaries", () => {
  assert.equal(resolveFocusTrapDestination({ activeIndex: 0, itemCount: 7, shiftKey: true }), 6);
  assert.equal(resolveFocusTrapDestination({ activeIndex: 6, itemCount: 7, shiftKey: false }), 0);
  assert.equal(resolveFocusTrapDestination({ activeIndex: 3, itemCount: 7, shiftKey: false }), null);
  assert.equal(resolveFocusTrapDestination({ activeIndex: -1, itemCount: 0, shiftKey: false }), null);
});

test("mobile drawer closes when resize or orientation leaves the mobile breakpoint", () => {
  assert.equal(shouldCloseDrawerForViewport({ open: true, isMobile: false }), true);
  assert.equal(shouldCloseDrawerForViewport({ open: true, isMobile: true }), false);
  assert.equal(shouldCloseDrawerForViewport({ open: false, isMobile: false }), false);
});


test("all works sorts by numeric heat rather than CMS sort weight and keeps ties stable", () => {
  const make = (slug: string, heat: string, visible = true): CmsContent => ({
    id: slug, type: "work", slug, locale: "zh-Hant", title: slug, featured: false, sortWeight: 100,
    data: { heat, visible },
  });
  const managedWorks = [make("low", "999"), make("high", "2.5萬"), make("tie", "25,000"), make("hidden", "999999", false), make("unknown", "熱門"), make("rank-label", "TOP 1")];
  const before = managedWorks.map(item => item.slug);
  assert.deepEqual(buildJygAllWorksModel({ dramas: [], managedWorks }).items.map(item => item.slug), ["high", "tie", "low", "unknown", "rank-label"]);
  assert.deepEqual(managedWorks.map(item => item.slug), before);
  assert.equal(workHeatValue("1.2K"), 1200);
  assert.equal(workHeatValue("3.6万"), 36000);
  assert.equal(workHeatValue("2M"), 2000000);
  assert.equal(workHeatValue("TOP 1"), -1);
  const fallback = buildJygAllWorksModel({ dramas: [] });
  assert.ok(fallback.items.every((item, i) => i === 0 || workHeatValue(fallback.items[i - 1].heat) >= workHeatValue(item.heat)));
});


test("old navigation heroes gain the missing subtitle without overwriting saved or cleared copy", () => {
  const upgraded = navigationHeroProps("/universe", { title: "AI 創作中心" });
  assert.equal(upgraded.subtitle, "學習、創造、啟發");
  assert.equal(upgraded.navigationCopyVersion, 1);
  assert.equal(navigationHeroProps("/universe", { subtitle: "自訂副標題" }).subtitle, "自訂副標題");
  assert.equal(navigationHeroProps("/universe", { navigationCopyVersion: 1, subtitle: "" }).subtitle, "");
  assert.equal(navigationHeroProps("/universe", { navigationCopyVersion: 1 }).subtitle, undefined);
});

test("home sorts before limiting to twelve and category filtering retains descending heat", () => {
  const managedWorks: CmsContent[] = Array.from({ length: 14 }, (_, i) => ({
    id: String(i), slug: String(i), title: String(i), locale: "zh-Hant", type: "work", featured: false, sortWeight: -i,
    data: { heat: String(i * 100), genre: i % 2 ? "都市" : "古風" },
  }));
  const items = buildJygFeaturedWorksModel({ home, dramas: [], managedWorks }).items;
  assert.equal(items.length, 12);
  assert.equal(items[0].slug, "13");
  assert.equal(items[11].slug, "2");
  assert.deepEqual(items.filter(item => item.genre === "都市").map(item => item.heat), ["1300", "1100", "900", "700", "500", "300"]);
  assert.equal(managedWorks[0].slug, "0");
});

test("public navigation has the six requested destinations in the same order for both layouts", () => {
  const original = [{ id: "home", href: "/", label: "首頁" }, { id: "old", href: "/universe", label: "AI宇宙" }];
  const nav = publicNavigation(original);
  assert.deepEqual(nav.map(item => item.href), ["/universe", "/tasks", "/business", "/about", "/news", "/contact"]);
  assert.deepEqual(nav.map(item => item.label), ["AI創作中心", "價目表", "IP授權", "關於我們", "最新消息", "聯絡我們"]);
  assert.equal(original[1].label, "AI宇宙");
});

test("playback background settings map dynamic routes and produce the same saved CSS as preview", () => {
  assert.equal(backgroundSettingsPath("/universe/videos/demo"), "/video-player");
  assert.equal(backgroundSettingsPath("/works/demo"), "/episode-player");
  assert.equal(backgroundSettingsPath("/login"), "/login");
  assert.equal(backgroundSettingsPath("/universe/videos"), "/universe/videos");
  const block = { ...defaultBackgroundBlocks()[0], id: "test", props: { backgroundUrl: "/cms-media/test.jpg", backgroundPosition: "right top" } };
  assert.equal(managedBlockStyle(block).backgroundImage, 'url("/cms-media/test.jpg")');
  assert.equal(managedBlockStyle(block).backgroundPosition, "right top");
  assert.equal(managedBlockStyle({ ...block, props: { backgroundUrl: "" } }).backgroundImage, undefined);
});
