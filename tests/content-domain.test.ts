import { strict as assert } from "node:assert";
import test from "node:test";
import nextConfig from "../next.config.ts";

import { LocalContentProvider } from "@/content/providers/local-content-provider";
import { publishLatestDraft, verifyPublishedFooterCopyright } from "@/content/cms/admin-publish";
import { cmsRequestOptions } from "@/content/cms/java-cms-client";
import { ensureHomeSectionBlocks, parseCategoryLabels } from "@/content/cms/home-section-settings";
import { managedBlockStyle } from "@/content/cms/managed-page-style";
import { allWorksHeroBackground, defaultWorksSectionBlocks } from "@/content/cms/works-page-settings";
import { defaultFooterSettings, resolveFooterSettings, safeFooterBackground, safeFooterHref } from "@/content/cms/footer-settings";
import { buildArticleJsonLd, buildCreatorJsonLd, buildDramaJsonLd, buildHomeJsonLd } from "@/content/seo";
import { serializeJsonLd } from "@/content/seo/safe-json-ld";
import { InternalHrefSchema } from "@/content/types";
import { findDuplicateSlugs, productionIssues, sanitizeDownloadSettings } from "@/content/validation";
import { sanitizeAnalyticsParameters } from "@/lib/analytics/events";
import { parseStoredConsent, shouldLoadAnalytics } from "@/lib/consent";
import { resolveDramaDeepLink } from "@/lib/deeplink";
import { shouldAttachVideoSource, shouldAutoplayVideo, shouldInitializeHomeMotion } from "@/lib/motion/runtime";
import { buildContentSecurityPolicy } from "@/lib/security/csp";

test("same-origin Java API paths are proxied instead of falling into the HTML catch-all", async () => {
  const previousCmsApiUrl = process.env.CMS_API_URL;
  process.env.CMS_API_URL = "";
  const rewrites = await nextConfig.rewrites?.();
  if (previousCmsApiUrl === undefined) delete process.env.CMS_API_URL;
  else process.env.CMS_API_URL = previousCmsApiUrl;
  assert.ok(Array.isArray(rewrites));
  const sources = rewrites.map((rewrite) => rewrite.source);
  assert.ok(sources.includes("/admin-api/:path*"));
  assert.ok(sources.includes("/public-api/:path*"));
  const mediaRewrite = rewrites.find((rewrite) => rewrite.source === "/cms-media/:path*");
  assert.equal(mediaRewrite?.destination, "http://127.0.0.1:8080/public-api/v1/sites/mydream/assets/:path*");
});

test("JSON-LD serialization cannot terminate the script element", () => {
  const serialized = serializeJsonLd({
    title: "</script><script>alert('stored-xss')</script>",
    separator: "line paragraph end",
  });
  assert.equal(serialized.includes("<"), false);
  assert.equal(serialized.includes(" "), false);
  assert.equal(serialized.includes(" "), false);
  assert.match(serialized, /\\u003c\/script>/);
});

test("internal links reject unsafe destinations", () => {
  assert.equal(InternalHrefSchema.safeParse("/download").success, true);
  assert.equal(InternalHrefSchema.safeParse("/#rewards").success, true);
  assert.equal(InternalHrefSchema.safeParse("//evil.example/path").success, false);
  assert.equal(InternalHrefSchema.safeParse("/\\evil.example").success, false);
  assert.equal(InternalHrefSchema.safeParse("/download\njavascript:alert(1)").success, false);
});

test("production validation rejects placeholder media", () => {
  assert.deepEqual(productionIssues({
    publicationStatus: "published",
    poster: { src: "/media/unmarked.webp", alt: "待替換內容", isPlaceholder: true },
  }), ["Content contains placeholder copy, media, or a # URL."]);
});

test("local repository exposes frontend content and production hides drafts", async () => {
  const previous = process.env.NODE_ENV;
  Object.assign(process.env, { NODE_ENV: "production" });
  const repository = new LocalContentProvider();
  assert.equal((await repository.getDramas()).length, 0);
  assert.equal((await repository.getFeaturedArticles()).length, 0);
  assert.equal((await repository.getDramaCategories()).length, 2);
  assert.equal((await repository.getArticleCategories()).length, 1);
  Object.assign(process.env, { NODE_ENV: previous });
});

test("unsafe store links are sanitized", () => {
  assert.deepEqual(sanitizeDownloadSettings({
    id: "download-settings",
    ios: { availability: "available", url: "#" },
    googlePlay: { availability: "coming-soon" },
    android: { availability: "coming-soon" },
    qrCodeStatus: "coming-soon",
    deepLinkStatus: "coming-soon",
  }), {
    id: "download-settings",
    ios: { availability: "coming-soon" },
    googlePlay: { availability: "coming-soon" },
    android: { availability: "coming-soon" },
    qrCodeStatus: "coming-soon",
    deepLinkStatus: "coming-soon",
  });
});

test("duplicate slugs and draft structured data are rejected", () => {
  assert.deepEqual(findDuplicateSlugs([{ slug: "one" }, { slug: "two" }, { slug: "one" }]), ["one"]);
  const site = { id: "site", name: "My Dream", locale: "zh-Hant", siteUrl: "https://mydream.example.com", defaultSeo: { noIndex: false }, socialLinks: {} } as const;
  const draftDrama = { id: "d", slug: "draft", title: "草稿", synopsis: "草稿", categoryIds: ["drama"], categories: ["短劇"], tags: [], poster: { src: "/placeholder.webp", alt: "placeholder", isPlaceholder: true }, availability: "upcoming", featured: false, publicationStatus: "draft" } as unknown as Parameters<typeof buildDramaJsonLd>[1];
  const draftArticle = { id: "a", slug: "draft", title: "草稿", excerpt: "草稿", categoryId: "article", category: "內容", cover: { src: "/placeholder.webp", alt: "placeholder", isPlaceholder: true }, author: "My Dream", publishedAt: "2026-01-01", body: ["草稿"], featured: false, publicationStatus: "draft" } as unknown as Parameters<typeof buildArticleJsonLd>[1];
  const draftCreator = { id: "c", slug: "draft", displayName: "草稿", bio: "草稿", featured: false, publicationStatus: "draft" } as unknown as Parameters<typeof buildCreatorJsonLd>[1];
  assert.deepEqual(buildDramaJsonLd(site, draftDrama), []);
  assert.deepEqual(buildArticleJsonLd(site, draftArticle), []);
  assert.deepEqual(buildCreatorJsonLd(site, draftCreator), []);

  const section = { visibility: "published" as const };
  const home = { id: "home", hero: section, brandStatement: section, viewerCreator: section, dramaDiscovery: section, creatorCenter: section, creatorFeed: section, rewards: section, profile: section, latestContent: section, journal: section, downloadCTA: section, featuredDramaIds: [], featuredCreatorIds: [], featuredArticleIds: [], visibility: "published" } as unknown as Parameters<typeof buildHomeJsonLd>[1];
  const homeData = buildHomeJsonLd(site, home, {
    id: "download-settings",
    ios: { availability: "coming-soon" },
    googlePlay: { availability: "coming-soon" },
    android: { availability: "coming-soon" },
    qrCodeStatus: "coming-soon",
    deepLinkStatus: "coming-soon",
  });
  assert.equal(homeData.length, 2);
});

test("analytics remains opt-in and strips PII", () => {
  assert.equal(parseStoredConsent(null), "unset");
  assert.equal(parseStoredConsent("analytics"), "accepted");
  assert.equal(shouldLoadAnalytics({ hydrated: true, consent: "accepted", enabled: true, providerId: "G-TEST" }), true);
  assert.equal(shouldLoadAnalytics({ hydrated: true, consent: "rejected", enabled: true, providerId: "G-TEST" }), false);
  assert.deepEqual(sanitizeAnalyticsParameters({ email: "x@example.com", phone: "123", safe: "download" }), { safe: "download" });
});

test("deep links fall back safely when app links are unavailable", () => {
  assert.equal(resolveDramaDeepLink("safe-slug", { id: "download-settings", ios: { availability: "available", url: "https://apps.example/ios" }, googlePlay: { availability: "coming-soon" }, android: { availability: "coming-soon" }, qrCodeStatus: "coming-soon", deepLinkBase: "https://links.example", deepLinkStatus: "available" }).kind, "app");
  assert.equal(resolveDramaDeepLink("safe-slug", { id: "download-settings", ios: { availability: "coming-soon" }, googlePlay: { availability: "coming-soon" }, android: { availability: "coming-soon" }, qrCodeStatus: "coming-soon", deepLinkStatus: "coming-soon" }).kind, "web");
});

test("security policy and motion runtime keep safe defaults", () => {
  const development = buildContentSecurityPolicy("development", "http://localhost:8080/admin-api");
  const production = buildContentSecurityPolicy("production", undefined, "https://mydream.example.com");
  const productionHttp = buildContentSecurityPolicy("production", undefined, "http://127.0.0.1:3021");
  assert.match(development, /script-src[^;]*'unsafe-eval'/);
  assert.match(development, /connect-src[^;]*http:\/\/localhost:8080/);
  assert.match(development, /img-src[^;]*http:\/\/localhost:8080/);
  assert.match(development, /media-src[^;]*http:\/\/localhost:8080/);
  assert.doesNotMatch(development, /upgrade-insecure-requests/);
  assert.doesNotMatch(production, /'unsafe-eval'/);
  assert.match(production, /object-src 'none'/);
  assert.match(production, /upgrade-insecure-requests/);
  assert.doesNotMatch(productionHttp, /upgrade-insecure-requests/);
  assert.equal(shouldInitializeHomeMotion({ pathname: "/", reviewMode: false, reducedMotion: false }), true);
  assert.equal(shouldInitializeHomeMotion({ pathname: "/", reviewMode: false, reducedMotion: true }), false);
  assert.equal(shouldAttachVideoSource({ visible: true, reducedMotion: false }), true);
  assert.equal(shouldAutoplayVideo({ visible: true, reducedMotion: false, active: true, autoPlay: true }), true);
});

test("admin saves update the public release immediately and CMS reads bypass stale cache", async () => {
  const calls: Array<{ path: string; options?: RequestInit; csrf?: boolean }> = [];
  const request = async <T>(path: string, options?: RequestInit, csrf?: boolean): Promise<T> => {
    calls.push({ path, options, csrf });
    return {} as T;
  };

  await publishLatestDraft(request, "site-id", "更新官网页面：首页");

  assert.equal(cmsRequestOptions.cache, "no-store");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, "/admin-api/v1/sites/site-id/releases");
  assert.equal(calls[0].options?.method, "POST");
  assert.equal(calls[0].csrf, true);
  assert.deepEqual(JSON.parse(String(calls[0].options?.body)), { changeNote: "更新官网页面：首页" });
});

test("footer publishing verifies that the public release contains the edited copyright", async () => {
  const calls: string[] = [];
  const request = async <T>(path: string): Promise<T> => {
    calls.push(path);
    return {
      config: { footer: { ...defaultFooterSettings, copyright: "剧有梗数位媒体创作股份有限公司" } },
    } as T;
  };

  await verifyPublishedFooterCopyright(request, "mydream", "剧有梗数位媒体创作股份有限公司");

  assert.equal(calls.length, 1);
  assert.match(calls[0], /^\/public-api\/v1\/sites\/mydream\/shell\?refresh=\d+$/);
});

test("footer publishing reports an error instead of a false success when the public release is stale", async () => {
  const request = async <T>(): Promise<T> => ({
    config: { footer: { ...defaultFooterSettings, copyright: defaultFooterSettings.copyright } },
  }) as T;

  await assert.rejects(
    verifyPublishedFooterCopyright(request, "mydream", "剧有梗数位媒体创作股份有限公司"),
    /公開版本仍是舊內容/,
  );
});

test("home tuning exposes fixed visual cards for every homepage section", () => {
  const existing = [
    { type: "hero", schemaVersion: 1, zone: "main", order: 0, visible: true, props: {}, style: {} },
    { type: "section-heading", schemaVersion: 1, zone: "main", order: 1, visible: true, props: {}, style: {} },
  ];
  const blocks = ensureHomeSectionBlocks("/", existing);

  assert.deepEqual(blocks.map((block) => block.type), ["hero", "section-heading", "category-tabs"]);
  assert.equal(blocks[2].props.title, "按分類探索作品");
  assert.equal(blocks[2].style.columns, 6);
  const aboutBlocks = ensureHomeSectionBlocks("/about", existing);
  assert.deepEqual(aboutBlocks.map((block) => block.zone), ["hero", "story", "platform", "join", "characters", "banner"]);
  assert.equal(aboutBlocks[1].props.backgroundMediaId, "6cd7b92f-c5d5-3950-9038-9bfb8a5d2472");
  assert.equal(aboutBlocks[2].props.cardThreeImageMediaId, "c1f1df8f-3308-3331-a74a-5a7f61935eb1");
  assert.deepEqual(parseCategoryLabels("全部,短劇,科幻", ["全部", "AI短劇", "科幻", "玄幻"]), ["全部", "短劇", "科幻", "玄幻"]);
});

test("all works editing preserves saved text and media while adding missing sections", () => {
  const defaults = defaultWorksSectionBlocks();
  assert.deepEqual(defaults.map((block) => block.zone), ["hero", "works-library"]);
  assert.equal(defaults[0].props.backgroundUrl, allWorksHeroBackground);
  const saved = { ...defaults[0], id: "saved-hero", props: { title: "新作品標題", description: "", backgroundMediaId: "custom-image", backgroundUrl: "/cms-media/custom.png" } };
  const blocks = ensureHomeSectionBlocks("/works", [saved]);
  assert.equal(blocks[0].id, saved.id);
  for (const [key, value] of Object.entries(saved.props)) assert.deepEqual(blocks[0].props[key], value);
  assert.equal(blocks[0].props.subtitle, defaults[0].props.subtitle);
  assert.equal(blocks[0].props.featureOneTitle, defaults[0].props.featureOneTitle);
  assert.equal("subtitle" in saved.props, false);
  assert.equal(blocks[0].props.description, "");
  assert.equal(blocks[0].props.backgroundMediaId, "custom-image");
  assert.equal(blocks[1].props.title, "全部作品");
  assert.deepEqual(ensureHomeSectionBlocks("/works", blocks), blocks);
  blocks[1].props.title = "另一個列表標題";
  assert.equal(defaultWorksSectionBlocks()[1].props.title, "全部作品");
  assert.equal(managedBlockStyle({ ...saved, id: "saved-hero" }, { hero: true, includeBackgroundImage: false }).backgroundImage, undefined);
});

test("pricing editor adds the consumer rights background without replacing saved blocks", () => {
  const existing = [{ id: "coins", type: "pricing-grid", schemaVersion: 1, zone: "coins", order: 4, visible: true, props: { title: "金幣充值" }, style: {} }];
  const blocks = ensureHomeSectionBlocks("/tasks", existing);
  assert.equal(existing.length, 1);
  assert.equal(blocks[0], existing[0]);
  const rights = blocks[1];
  assert.equal(rights.zone, "consumer-rights");
  assert.equal(rights.order, 5);
  assert.equal(rights.props.backgroundUrl, "");
  rights.props.backgroundMediaId = "chosen-image";
  rights.props.backgroundUrl = "/cms-media/rights-background.png";
  rights.props.backgroundPosition = "right bottom";
  assert.deepEqual(ensureHomeSectionBlocks("/tasks", blocks), blocks);
  assert.equal(ensureHomeSectionBlocks("/tasks", [])[0].props.backgroundMediaId, "");
  assert.equal(ensureHomeSectionBlocks("/contact", existing), existing);
});

test("consumer rights backgrounds cover the panel and clearing restores CSS defaults", () => {
  const block = { ...ensureHomeSectionBlocks("/tasks", [])[0], id: "rights" };
  assert.equal(managedBlockStyle(block).backgroundImage, undefined);
  block.props.backgroundUrl = "/cms-media/rights-background.png";
  block.props.backgroundPosition = "right bottom";
  const background = managedBlockStyle(block);
  assert.equal(background.backgroundImage, 'url("/cms-media/rights-background.png")');
  assert.equal(background.backgroundPosition, "right bottom");
  assert.equal(background.backgroundSize, "cover");
  assert.equal(background.height, undefined);
  block.props.backgroundUrl = "";
  assert.equal(managedBlockStyle(block).backgroundImage, undefined);
  assert.equal(managedBlockStyle(block).backgroundSize, undefined);
});

test("footer bundled background uses the static asset even for an old saved CMS alias", () => {
  assert.equal(safeFooterBackground("/cms-media/assets/jyg/footer-global-network-map-hd.png"), "/assets/jyg/footer-global-network-map-hd.png");
  assert.equal(safeFooterBackground(""), "/assets/jyg/footer-global-network-map-hd.png");
  assert.equal(safeFooterBackground("/media/custom.png"), "/media/custom.png");
  assert.equal(safeFooterBackground("https://example.test/custom.png"), "https://example.test/custom.png");
});

test("footer settings merge partial CMS values and reject unsafe URLs", () => {
  const footer = resolveFooterSettings({ brandTitle: "新的品牌文字", brandTitleSize: 36, detailTextSize: "20" });
  assert.equal(footer.brandTitle, "新的品牌文字");
  assert.equal(footer.brandTitleSize, 36);
  assert.equal(footer.detailTextSize, defaultFooterSettings.detailTextSize);
  assert.equal(footer.email, defaultFooterSettings.email);
  assert.equal(safeFooterHref("javascript:alert(1)"), "/universe");
  assert.equal(safeFooterHref("/contact"), "/contact");
  assert.equal(safeFooterBackground("data:text/html,bad"), defaultFooterSettings.backgroundUrl);
});


test("coin usage background is added to existing pricing pages and retained on reopening", () => {
  const original = ensureHomeSectionBlocks("/tasks", []).filter(block => block.zone !== "coin-usage");
  const blocks = ensureHomeSectionBlocks("/tasks", original);
  const usage = blocks.find(block => block.zone === "coin-usage")!;
  usage.props.backgroundUrl = "/cms-media/custom-coin-background.png";
  usage.props.backgroundPosition = "left top";
  const reopened = ensureHomeSectionBlocks("/tasks", blocks);
  assert.equal(reopened.filter(block => block.zone === "coin-usage").length, 1);
  assert.equal(reopened.find(block => block.zone === "coin-usage"), usage);
  assert.equal(managedBlockStyle({ ...usage, id: "usage" }).backgroundImage, 'url("/cms-media/custom-coin-background.png")');
  assert.equal(reopened[0], original[0]);
});
