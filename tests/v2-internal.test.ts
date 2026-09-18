import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { validateUpload } from "@/lib/trademark-uploads";

import type { Article, Drama } from "@/content/types";
import type { CmsContent } from "@/content/cms/java-cms-client";
import { LocalContentProvider } from "@/content/providers/local-content-provider";
import { buildArticleJsonLd, buildDramaJsonLd } from "@/content/seo";
import {
  articleNeighbors,
  episodePreviewNumbers,
  isPublicArticle,
  isPublicDrama,
  publishedArticles,
  publishedDramas,
  storeStatusLabel,
  v2InternalRoutes,
} from "@/features/v2/internal-model";
import {
  buildNewsDetailModel,
  buildNewsIndexModel,
} from "@/features/jyg/news-model";
import { managedNewsArticle, managedNewsArticles } from "@/features/jyg/managed-news";
import { NEWS_CATEGORY_LABELS, PUBLIC_NEWS_CATEGORY_LABELS, newsCategoryLabel } from "@/features/jyg/news-categories";
import { shouldInitializePageMotion } from "@/lib/motion/runtime";
import { duplicateEpisodeNumbers, nextVisibleEpisodeNumber } from "@/features/admin/episode-batch-model";
import { nextAvailableContentSlug } from "@/features/admin/content-slug";
import { managedFieldStyle } from "@/content/cms/managed-page-style";
import { GET as getHealth } from "@/app/healthz/route";

test("News hero references its locally deployed public asset", () => {
  const newsPage = readFileSync("src/app/(frontend)/news/page.tsx", "utf8");
  assert.match(newsPage, /image=\{text\(hero\.backgroundUrl, "\/assets\/jyg\/news-hero-information-dashboard\.png"\)\}/);
  assert.doesNotMatch(newsPage, /image="\/cms-media\/assets\/jyg\/news-hero-information-dashboard\.png"/);
});

test("AI KOL certification overview is available at /creator-id with complete local artwork", () => {
  const page = readFileSync("src/app/(frontend)/creator-id/page.tsx", "utf8");
  const landing = readFileSync("src/components/creator-id/creator-id-landing.tsx", "utf8");
  const showcase = readFileSync("src/components/creator-id/creator-id-showcase.tsx", "utf8");
  const landingStyles = readFileSync("src/components/creator-id/creator-id.module.css", "utf8");
  const showcaseStyles = readFileSync("src/components/creator-id/creator-id-showcase.module.css", "utf8");
  const navigation = readFileSync("src/data/jyg-prototype.ts", "utf8");
  const sitemap = readFileSync("src/app/sitemap.ts", "utf8");
  const migration = readFileSync("backend/src/main/resources/db/migration/V21__creator_id_navigation.sql", "utf8");

  assert.match(page, /CreatorIdLanding/);
  assert.match(page, /canonical: "\/creator-id"/);
  assert.match(landing, /data-page="creator-id-landing"/);
  assert.match(showcase, /AI KOL 平台認證/);
  assert.match(showcase, /專業權益保護方案/);
  assert.match(`${landing}\n${showcase}`, /href="\/creator-id\/apply"/);
  assert.match(navigation, /label: "AI KOL", href: "\/creator-id"/);
  assert.match(sitemap, /"\/creator-id"/);
  assert.match(migration, /'\/creator-id'/);
  assert.match(landingStyles, /@media \(max-width: 947px\)[\s\S]*\.serviceHeroActions\s*\{[\s\S]*flex-direction:\s*column/);
  assert.match(landingStyles, /\.heroZeroBadge\s*\{\s*top:\s*-18px;[\s\S]*width:\s*68px;[\s\S]*height:\s*33px;/);
  assert.match(landingStyles, /\.serviceLanding \.shell\s*\{\s*width:\s*min\(calc\(100% - 64px\), 1280px\);/);
  assert.match(showcaseStyles, /\.shell\s*\{\s*width:\s*min\(calc\(100% - 64px\), 1280px\);/);
  assert.match(showcaseStyles, /\.pathSection \.shell\s*\{[^}]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/s);

  const assetPaths = [...`${landing}\n${showcase}`.matchAll(/"(\/assets\/creator-id\/ux-hd\/[^"']+)"/g)]
    .map((match) => match[1]);
  assert.ok(assetPaths.length >= 20);
  for (const assetPath of assetPaths) {
    assert.equal(existsSync(`public${assetPath}`), true, assetPath);
  }
});

test("project protection hero uses the same desktop background ratio as other navigation pages", () => {
  const styles = readFileSync("src/components/creator-id/creator-id.module.css", "utf8");

  assert.match(styles, /--service-hero-height-desktop:\s*620px;/);
  assert.match(styles, /\.serviceHero\s*\{[^}]*height:\s*var\(--service-hero-height-desktop\);/s);
  assert.doesNotMatch(styles, /\.serviceHero\s*\{[^}]*height:\s*(?:400|480)px;/s);
  assert.match(styles, /\.serviceHero > \.shell\s*\{\s*height:\s*567px;/);
});

test("professional rights standalone page is integrated with its route, assets, form endpoint and navigation", () => {
  const page = readFileSync("src/app/(frontend)/creator-id/protection/page.tsx", "utf8");
  const component = readFileSync("src/components/creator-id/professional-rights-page.tsx", "utf8");
  const styles = readFileSync("src/components/creator-id/professional-rights-page.module.css", "utf8");
  const endpoint = readFileSync("src/app/api/pre-reviews/route.ts", "utf8");
  const sitemap = readFileSync("src/app/sitemap.ts", "utf8");
  const navigation = readFileSync("src/data/jyg-prototype.ts", "utf8");
  const migration = readFileSync("backend/src/main/resources/db/migration/V20__professional_rights_navigation.sql", "utf8");
  const assetNames = [
    "01_creation_evidence@4x.png",
    "02_evidence_preservation@4x.png",
    "03_rights_organization@4x.png",
    "04_trademark_evaluation@4x.png",
    "05_trademark_application@4x.png",
    "06_legal_support@4x.png",
    "hero-character-hologram@2x.png",
    "md-logo@4x.png",
  ];

  assert.match(page, /ProfessionalRightsPage/);
  assert.match(page, /canonical: "\/creator-id\/protection"/);
  assert.match(component, /fetch\("\/api\/pre-reviews"/);
  assert.match(component, /data-page="professional-rights-taiwan"/);
  assert.match(styles, /\.modalBackdrop/);
  assert.match(
    styles,
    /\.hero,[\s\S]*\.bottomNotice\s*\{\s*width:\s*min\(100%, 1360px\);/,
  );
  assert.match(styles, /\.modal\s*\{[^}]*width:\s*min\(100%, 1500px\);/s);
  assert.equal(validateUpload({ name: "logo.png", type: "image/png", size: 10 * 1024 * 1024 }, "trademarkImage"), true);
  assert.equal(validateUpload({ name: "logo.png", type: "image/png", size: 10 * 1024 * 1024 + 1 }, "trademarkImage"), false);
  assert.match(endpoint, /\.data["'], "pre-reviews"/);
  assert.match(sitemap, /"\/creator-id\/protection"/);
  assert.match(navigation, /href: "\/creator-id\/protection"/);
  assert.match(migration, /'\/creator-id\/protection'/);
  assert.match(
    readFileSync("Dockerfile", "utf8"),
    /mkdir -p \/app\/\.data\/pre-reviews && chown -R mydream:mydream \/app\/\.data/,
  );
  const productionCompose = readFileSync("deploy/compose.production.yaml", "utf8");
  assert.match(productionCompose, /mydream_pre_reviews:\/app\/\.data/);
  assert.match(productionCompose, /mydream_pre_reviews:/);
  for (const assetName of assetNames) {
    assert.equal(existsSync(`public/assets/creator-id/professional-rights/${assetName}`), true, assetName);
  }
});

test("news hero keeps the uploaded right-side artwork unobstructed and uncropped on desktop", () => {
  const styles = readFileSync("src/app/(frontend)/prototype.css", "utf8");
  assert.match(styles, /\.jyg-global-hero-background--news \.jyg-global-hero-background__image\s*\{[^}]*object-fit:\s*fill/s);
  assert.match(styles, /\.jyg-global-hero-background--news \.jyg-global-hero-background__overlay\s*\{[^}]*transparent 58%[^}]*\}/s);
  assert.match(styles, /\.jyg-news-hero__planet\s*\{[^}]*display:\s*none/s);
});

const drama: Drama = {
  id: "published-drama",
  slug: "published-drama",
  title: "已发布短劇",
  synopsis: "通过 CMS 发布过滤的真实内容。",
  categoryIds: ["emotion"],
  categories: ["情感"],
  tags: ["剧情"],
  poster: { src: "/media/published-drama.webp", alt: "已发布短劇海报", isPlaceholder: false },
  episodes: 18,
  availability: "available",
  featured: true,
  publicationStatus: "published",
};

const article: Article = {
  id: "published-article",
  slug: "published-article",
  title: "已发布文章",
  excerpt: "通过 CMS 发布过滤的真实文章。",
  categoryId: "news",
  category: "平台消息",
  cover: { src: "/media/published-article.webp", alt: "已发布文章封面", isPlaceholder: false },
  author: "My Dream 编辑部",
  publishedAt: "2026-08-03",
  body: ["已发布正文"],
  featured: true,
  publicationStatus: "published",
};

test("Explore only exposes published dramas with non-placeholder media", () => {
  const draft = { ...drama, id: "draft", slug: "draft", publicationStatus: "draft" as const };
  const placeholder = { ...drama, id: "placeholder", slug: "placeholder", poster: { ...drama.poster, isPlaceholder: true } };
  assert.deepEqual(publishedDramas([draft, placeholder, drama]).map((item) => item.slug), ["published-drama"]);
  assert.equal(isPublicDrama(draft), false);
  assert.equal(isPublicDrama(drama), true);
});

test("Drama slug resolution returns null for a missing record", async () => {
  const provider = new LocalContentProvider();
  assert.equal(await provider.getDramaBySlug("does-not-exist"), null);
});

test("Journal only exposes published articles and resolves neighbors safely", () => {
  const older = { ...article, id: "older", slug: "older", publishedAt: "2026-08-01", featured: false };
  const draft = { ...article, id: "draft-article", slug: "draft-article", publicationStatus: "draft" as const };
  assert.deepEqual(publishedArticles([older, draft, article]).map((item) => item.slug), ["published-article", "older"]);
  assert.equal(isPublicArticle(draft), false);
  assert.deepEqual(articleNeighbors([older, article], "published-article"), { previous: undefined, next: older });
});

test("Phase 5 news view model publishes only safe CMS articles on /news", () => {
  const older = { ...article, id: "older-news", slug: "older-news", publishedAt: "2026-08-01", featured: false };
  const draft = { ...article, id: "draft-news", slug: "draft-news", publicationStatus: "draft" as const };
  const placeholder = {
    ...article,
    id: "placeholder-news",
    slug: "placeholder-news",
    cover: { src: "/placeholder.webp", alt: "placeholder", isPlaceholder: true },
  };
  const categories = [{
    id: "news",
    slug: "brand-news",
    name: "品牌新聞",
    description: "品牌新聞",
    order: 1,
    kind: "article" as const,
    contentStatus: "published" as const,
  }];
  const model = buildNewsIndexModel({ articles: [older, draft, placeholder, article], categories });

  assert.equal(model.basePath, "/news");
  assert.deepEqual(model.articles.map((item) => item.slug), ["published-article", "older-news"]);
  assert.deepEqual(model.categories.map((item) => item.id), ["news"]);
});

test("Java CMS news maps structured headings, images and SEO into the public article", () => {
  const cmsArticle: CmsContent = {
    id: "cms-news-1",
    type: "article",
    slug: "managed-news",
    locale: "zh-Hant",
    title: "可管理消息",
    summary: "消息摘要",
    coverUrl: "http://localhost:8080/media/cover.webp",
    featured: true,
    sortWeight: 90,
    data: {
      subtitle: "消息副标题",
      categoryId: "seo-article",
      category: "SEO文章",
      author: "My Dream 编辑部",
      publishedAt: "2026-08-14",
      coverAlt: "消息封面",
      bodyBlocks: [
        { id: "h2", type: "heading1", text: "一级内容标题" },
        { id: "h3", type: "heading2", text: "二级内容标题" },
        { id: "image", type: "image", imageUrl: "http://localhost:8080/media/body.webp", alt: "正文图片", caption: "图片说明" },
      ],
      seo: {
        title: "SEO 标题",
        description: "SEO 描述",
        keywords: ["AI消息", "MY DREAM"],
        canonicalPath: "/news/managed-news",
        ogImageUrl: "http://localhost:8080/media/social.webp",
        noIndex: false,
      },
    },
  };

  const mapped = managedNewsArticle(cmsArticle);
  assert.equal(mapped?.subtitle, "消息副标题");
  assert.deepEqual(mapped?.bodyBlocks?.map((block) => block.type === "heading" ? block.level : block.type), [2, 3, "image"]);
  assert.equal(mapped?.seo?.title, "SEO 标题");
  assert.equal(mapped?.seo?.ogImage?.src, "http://localhost:8080/media/social.webp");
  assert.deepEqual(managedNewsArticles([], [article]), []);
  assert.deepEqual(managedNewsArticles(null, [article]), [article]);
});

test("news admin exposes CRUD, structured body and SEO media controls", () => {
  const source = readFileSync("src/app/admin/admin-console.tsx", "utf8");
  assert.match(source, /消息管理/);
  assert.match(source, /function NewsEditor/);
  assert.match(source, /一級內容標題（H2）/);
  assert.match(source, /二級內容標題（H3）/);
  assert.match(source, /SEO 標題/);
  assert.match(source, /社交分享圖片/);
  assert.match(source, /publishLatestDraft/);
});

test("work editor genre uses the same selectable categories as the public filter", () => {
  const source = readFileSync("src/app/admin/admin-console.tsx", "utf8");
  assert.match(source, /const workGenreOptions = \["古風", "都市", "漫劇", "奇幻", "穿越", "重生", "懸疑", "宮鬥宅鬥", "女性成長", "逆襲", "校園", "腦洞", "現代"\]/);
  assert.match(source, /admin-genre-picker/);
  assert.match(source, /type="checkbox"/);
  assert.match(source, /genre: normalizeWorkGenres\(data\.genre, "都市"\)/);
  assert.match(source, /genre: form\.genre/);
  assert.match(source, /availableGenres\.map/);
  assert.doesNotMatch(source, /題材分類<select multiple/);
});

test("work editor genre picker supports direct click toggles and visible selections", () => {
  const source = readFileSync("src/app/admin/admin-console.tsx", "utf8");
  assert.match(source, /admin-genre-picker/);
  assert.match(source, /type="checkbox"/);
  assert.match(source, /selectedGenres/);
  assert.match(source, /active.*genres|已選擇/);
  assert.doesNotMatch(source, /按住 Ctrl\/Command/);
});

test("work genre taxonomy migration maps retired seed values", () => {
  const migration = readFileSync("backend/src/main/resources/db/migration/V16__work_genre_taxonomy.sql", "utf8");
  assert.match(migration, /JSON_REPLACE\(version_row\.data_json, '\$\.genre', '腦洞'\)/);
  assert.match(migration, /JSON_REPLACE\(version_row\.data_json, '\$\.genre', '奇幻'\)/);
  assert.match(migration, /JSON_REPLACE\(version_row\.data_json, '\$\.genre', '現代'\)/);
});

test("work episode access uses a configurable free preview and app gate", () => {
  const page = readFileSync("src/app/(frontend)/works/[slug]/page.tsx", "utf8");
  const editor = readFileSync("src/app/admin/admin-console.tsx", "utf8");
  const gate = readFileSync("src/components/prototype/episode-download-gate.tsx", "utf8");
  const migration = readFileSync("backend/src/main/resources/db/migration/V17__work_episode_access_policy.sql", "utf8");
  const latestMigration = readFileSync("backend/src/main/resources/db/migration/V18__work_episode_free_preview_three.sql", "utf8");
  assert.match(page, /freeEpisodeCount/);
  assert.match(page, /showAllEpisodes/);
  assert.match(page, /EpisodeDownloadGate/);
  assert.match(editor, /免費試看集數/);
  assert.match(editor, /showAllEpisodes/);
  assert.match(gate, /下載 APP/);
  assert.match(migration, /\$\.freeEpisodeCount/);
  assert.match(migration, /\$\.showAllEpisodes/);
  assert.match(latestMigration, /\$\.freeEpisodeCount/);
  assert.match(latestMigration, /, 3, '\$\.showAllEpisodes'/);
  assert.match(page, /freeEpisodeCount: 3/);
});

test("contact form submits to Java CMS and exposes delivery feedback", () => {
  const form = readFileSync("src/components/prototype/jyg-business-collaboration.tsx", "utf8");
  const admin = readFileSync("src/app/admin/admin-console.tsx", "utf8");
  assert.match(form, /public-api\/v1\/sites\/mydream\/forms\/business-contact\/submissions/);
  assert.match(form, /onSubmit=\{submit\}/);
  assert.match(form, /資料已成功送出/);
  assert.doesNotMatch(form, /不會傳送或儲存資料/);
  assert.match(admin, /forms\/business-contact\/notification/);
  assert.match(admin, /SMTP 已配置/);
  assert.match(admin, /emailStatus/);
});

test("contact collaboration card removes the decorative orbit so its title aligns with the form", () => {
  const form = readFileSync("src/components/prototype/jyg-business-collaboration.tsx", "utf8");
  const styles = readFileSync("src/app/(frontend)/prototype.css", "utf8");
  assert.doesNotMatch(form, /jyg-business-collab-card__orbit/);
  assert.doesNotMatch(styles, /jyg-business-collab-card__orbit/);
  assert.match(styles, /\.jyg-business-collab-card > h2 \{[\s\S]*?margin:15px 0 14px;/);
});

test("frontend removes decorative English eyebrow labels", () => {
  const videoLibrary = readFileSync("src/app/(frontend)/universe/videos/page.tsx", "utf8");
  const videoDetail = readFileSync("src/app/(frontend)/universe/videos/[slug]/page.tsx", "utf8");
  const promptLibrary = readFileSync("src/app/(frontend)/universe/prompts/page.tsx", "utf8");
  assert.doesNotMatch(videoLibrary, /ORIGINAL FILM COLLECTION|AI ORIGINAL VIDEO|VIDEOS/);
  assert.doesNotMatch(videoDetail, /AI ORIGINAL VIDEO|VIDEO INTRODUCTION|AI PRODUCTION|MEDIA INFORMATION/);
  assert.doesNotMatch(promptLibrary, /AI PROMPT LIBRARY|PROMPT CATEGORIES|COMPLETE PROMPT RESOURCE/);
});

test("Phase 5 news detail rejects drafts and keeps related navigation inside /news", () => {
  const older = { ...article, id: "older-news", slug: "older-news", publishedAt: "2026-08-01", featured: false };
  const draft = { ...article, id: "draft-news", slug: "draft-news", publicationStatus: "draft" as const };

  assert.equal(buildNewsDetailModel({ article: draft, articles: [draft, article] }), null);
  const model = buildNewsDetailModel({ article, articles: [older, article] });
  assert.ok(model);
  assert.equal(model.basePath, "/news");
  assert.equal(model.next?.slug, "older-news");
});

test("Article slug resolution returns null for a missing record", async () => {
  const provider = new LocalContentProvider();
  assert.equal(await provider.getArticleBySlug("does-not-exist"), null);
});

test("draft and placeholder content cannot enter structured data", () => {
  const site = { id: "site" as const, name: "My Dream", locale: "zh-Hant" as const, siteUrl: "https://example.com", defaultSeo: { noIndex: false }, socialLinks: {} };
  assert.deepEqual(buildDramaJsonLd(site, { ...drama, publicationStatus: "draft" }), []);
  assert.deepEqual(buildArticleJsonLd(site, { ...article, cover: { ...article.cover, isPlaceholder: true } }), []);
});

test("Phase 5 news JSON-LD uses the canonical /news route and SEO keywords", () => {
  const site = { id: "site" as const, name: "My Dream", locale: "zh-Hant" as const, siteUrl: "https://example.com", defaultSeo: { noIndex: false }, socialLinks: {} };
  const newsArticle = { ...article, seo: { keywords: ["AI娛樂", "IP動態"], noIndex: false } };
  const structuredData = buildArticleJsonLd(site, newsArticle, { basePath: "/news" });
  const serialized = JSON.stringify(structuredData);

  assert.match(serialized, /https:\/\/example\.com\/news\/published-article/);
  assert.match(serialized, /AI娛樂/);

  const customized = buildArticleJsonLd(site, {
    ...newsArticle,
    seo: { ...newsArticle.seo, canonicalPath: "/news/custom-canonical", ogImage: { src: "/media/social.webp", alt: "分享图片", isPlaceholder: false } },
  }, { basePath: "/news" });
  const customizedJson = JSON.stringify(customized);
  assert.match(customizedJson, /https:\/\/example\.com\/news\/custom-canonical/);
  assert.match(customizedJson, /https:\/\/example\.com\/media\/social\.webp/);
});

test("episode preview never implies more than the real CMS count", () => {
  assert.deepEqual(episodePreviewNumbers(undefined), []);
  assert.deepEqual(episodePreviewNumbers(3), [1, 2, 3]);
  assert.equal(episodePreviewNumbers(60).length, 12);
});

test("work episode list uses numeric labels without a total episode count sentence", () => {
  const page = readFileSync("src/app/(frontend)/works/[slug]/page.tsx", "utf8");
  assert.match(page, /description=\"選擇集數觀看\"/);
  assert.match(page, /const episodeDisplayLabel = String\(episodeNumber\)/);
  assert.doesNotMatch(page, /description=\{[^}]*全集共/);
});

test("download availability never labels a missing URL as available", () => {
  assert.equal(storeStatusLabel({ availability: "available" }), "Coming soon");
  assert.equal(storeStatusLabel({ availability: "available", url: "https://example.com/app" }), "Available");
  assert.equal(storeStatusLabel({ availability: "temporarily-unavailable" }), "Temporarily unavailable");
});

test("download page renders separate Android and iOS QR media fields", () => {
  const source = readFileSync("src/app/(frontend)/download/page.tsx", "utf8");
  const styles = readFileSync("src/app/globals.css", "utf8");
  assert.doesNotMatch(source, /查看開放狀態|v2-download-device|PhoneMockup/);
  assert.match(source, /androidQrUrl/);
  assert.match(source, /iosQrUrl/);
  assert.match(source, /platform="Android"/);
  assert.match(source, /platform="iOS"/);
  assert.match(source, /GOOGLE_PLAY_APP_URL/);
  assert.match(source, /v2-store-card__platform-button/);
  assert.match(styles, /\.v2-store-card__platform-button\s*\{[\s\S]*display:\s*inline-flex[\s\S]*background:/);
});

test("AI universe uses independent original videos while episodes stay in work detail playback", () => {
  const universePage = readFileSync("src/app/(frontend)/universe/page.tsx", "utf8");
  const universeHub = readFileSync("src/components/prototype/jyg-ai-universe-hub.tsx", "utf8");
  const workDetail = readFileSync("src/app/(frontend)/works/[slug]/page.tsx", "utf8");

  assert.match(universePage, /getManagedPage\("\/universe", "zh-Hant"\)/);
  assert.match(universePage, /managedPage/);
  assert.match(universePage, /getManagedContent\("original-video"/);
  assert.doesNotMatch(universePage, /getManagedContent\("episode"/);
  assert.match(universeHub, /managedOriginalVideos/);
  assert.match(universeHub, /managedPage/);
  assert.match(universeHub, /backgroundUrl/);
  assert.match(universeHub, /\/universe\/videos\/\$\{video\.slug\}/);
  assert.match(universeHub, /unoptimized=\{item\.image\.startsWith\("http"\)\}/);
  assert.match(workDetail, /getManagedContent\("episode"/);
  assert.match(workDetail, /episode\.data\.workSlug === work\.slug/);
  assert.match(workDetail, /episode\.data\.videoUrl/);
});

test("about showcase follows the compact reference composition", () => {
  const page = readFileSync("src/app/(frontend)/about/page.tsx", "utf8");
  const styles = readFileSync("src/app/(frontend)/prototype.css", "utf8");
  for (const zone of ["hero", "story", "platform", "join"]) {
    assert.match(page, new RegExp(`data-cms-zone=["']${zone}["']`));
  }
  assert.match(page, /jyg-about-showcase--reference/);
  assert.match(page, /jyg-about-showcase__final-cta/);
  assert.match(page, /一起用 AI，開創原創娛樂的新時代/);
  assert.match(page, /jyg-about-showcase__characters-grid/);
  assert.match(page, /\{characters\.description\}/);
  assert.match(page, /cardOneImageUrl/);
  assert.match(page, /cardThreeImageUrl/);
  assert.match(page, /about-brand-story-v2\.png/);
  assert.doesNotMatch(page, /className="jyg-about-exact__flagship"/);
  assert.match(page, /jyg-about-cinematic/);
  assert.match(page, /jyg-about-exact/);
  const plan = readFileSync("src/content/cms/about-plan.ts", "utf8");
  assert.match(plan, /未來規劃/);
  assert.doesNotMatch(page, /data-cms-field="planningStepsTitle"/);
  assert.match(page, /planPrefixes\.map/);
  assert.match(page, /ImagePosition/);
  assert.match(styles, /jyg-about-exact__steps > div[^}]*display: grid/);
  assert.match(styles, /@media \(min-width: 701px\)[\s\S]*?\.jyg-about-exact__hero-copy,[\s\S]*?left: max\(32px, calc\(\(100vw - 1360px\) \/ 2\)\)/);
  // About page section separators should blend into the artwork instead of
  // rendering the previous full-width gold rules.
  assert.doesNotMatch(styles, /\.jyg-about-exact__hero\s*\{[^}]*border-bottom/);
  assert.doesNotMatch(styles, /\.jyg-about-exact__story\s*\{[^}]*border-bottom/);
  assert.doesNotMatch(styles, /\.jyg-about-exact__flagship\s*\{[^}]*border-(?:top|bottom|block)/);
  assert.doesNotMatch(styles, /\.jyg-about-exact__future\s*\{[^}]*border-(?:top|bottom|block)/);
  assert.doesNotMatch(styles, /\.jyg-about-exact__cta\s*\{[^}]*border-(?:top|bottom|block)/);
  assert.doesNotMatch(styles, /\.jyg-about-exact__steps > p::(?:before|after)/);
  assert.doesNotMatch(page, /jyg-about-exact__nav/);
  assert.doesNotMatch(styles, /body:has\(\.jyg-about-exact\)[\s\S]*?\.(?:jyg-navbar|jyg-mobile-drawer|brand-footer|consent-banner)/);
});

test("fixed-page live preview scales with its available width", () => {
  const source = readFileSync("src/app/admin/admin-console.tsx", "utf8");
  const styles = readFileSync("src/app/admin/admin.css", "utf8");
  assert.match(source, /ResizeObserver/);
  assert.match(source, /viewport\.clientWidth \/ 1440/);
  assert.match(source, /transformOrigin: "top left"/);
  assert.match(styles, /\.admin-live-preview__viewport--frame iframe\{[^}]*width:1440px[^}]*zoom:1/);
  assert.doesNotMatch(styles, /\.admin-live-preview__viewport--frame iframe\{[^}]*zoom:\.5/);
});

test("about AI drama card links to the homepage drama showcase", () => {
  const about = readFileSync("src/app/(frontend)/about/page.tsx", "utf8");
  const home = readFileSync("src/components/prototype/jyg-home.tsx", "utf8");
  assert.match(about, /cardOneHref: "\/#ai-universe"/);
  assert.match(home, /id="ai-universe"/);
});

test("about AI materials card links to AI prompt creation", () => {
  const about = readFileSync("src/app/(frontend)/about/page.tsx", "utf8");
  assert.match(about, /cardThreeAction: "立即創作"/);
  assert.match(about, /cardThreeHref: "\/universe\/prompts"/);
});

test("about AI tutorial card opens the AI universe tutorial category", () => {
  const about = readFileSync("src/app/(frontend)/about/page.tsx", "utf8");
  const seed = readFileSync("src/content/cms/home-section-settings.ts", "utf8");
  const universePage = readFileSync("src/app/(frontend)/universe/page.tsx", "utf8");
  const universeHub = readFileSync("src/components/prototype/jyg-ai-universe-hub.tsx", "utf8");
  assert.match(about, /cardTwoTitle: "AI 教學影片"[\s\S]*cardTwoHref: "\/universe\?category=tutorial"/);
  assert.match(seed, /cardTwoTitle: "AI 教學影片"[\s\S]*cardTwoHref: "\/universe\?category=tutorial"/);
  assert.match(universePage, /searchParams/);
  assert.match(universePage, /initialCategory/);
  assert.match(universeHub, /initialCategory === "tutorial"/);
});

test("AI universe tutorial content opens a playable detail route", () => {
  const hub = readFileSync("src/components/prototype/jyg-ai-universe-hub.tsx", "utf8");
  const managed = readFileSync("src/features/jyg/managed-universe.ts", "utf8");
  const detail = readFileSync("src/app/(frontend)/universe/videos/[slug]/page.tsx", "utf8");
  assert.match(hub, /managedTutorials/);
  assert.match(hub, /\/universe\/videos\/\$\{video\.slug\}/);
  assert.match(managed, /managedTutorialVideoList/);
  assert.match(managed, /videoUrl/);
  assert.match(detail, /managedTutorialVideoList/);
  assert.match(detail, /<video/);
});

test("AI universe category discovery omits the removed inspiration module", () => {
  const universe = readFileSync("src/components/prototype/jyg-ai-universe-hub.tsx", "utf8");
  const styles = readFileSync("src/app/(frontend)/prototype.css", "utf8");
  assert.match(universe, /id: "original"/);
  assert.match(universe, /id: "prompt"/);
  assert.match(universe, /id: "tutorial"/);
  assert.doesNotMatch(universe, /id: "inspiration", icon:/);
  assert.doesNotMatch(universe, /Lightbulb/);
  assert.match(styles, /\.jyg-ai-hub-category-grid \{[^}]*grid-template-columns:repeat\(3,/);
});

test("home work showcase links to the complete works page", () => {
  const home = readFileSync("src/components/prototype/jyg-home.tsx", "utf8");
  const page = readFileSync("src/app/(frontend)/works/page.tsx", "utf8");
  assert.match(home, /action=\{\{ label: String\(sectionProps\.actionLabel \?\? "查看全部作品"\), href: "\/works" \}\}/);
  assert.match(page, /JygAllWorksPage/);
  assert.match(page, /getManagedContent\("work", "zh-Hant", 100\)/);
  assert.match(page, /buildJygAllWorksModel/);
  assert.doesNotMatch(page, /JygLearningHub/);
});

test("pricing removes the recommendation badge and uses annual-member cyan highlight", () => {
  const page = readFileSync("src/app/(frontend)/tasks/page.tsx", "utf8");
  const styles = readFileSync("src/app/(frontend)/prototype.css", "utf8");
  assert.doesNotMatch(page, /推薦/);
  assert.doesNotMatch(page, /jyg-pricing-hero__brand-logo|jyg-pricing-hero__coin/);
  assert.match(page, /is-highlighted/);
  assert.match(styles, /\.jyg-tasks-page \.jyg-coin-card\.is-highlighted[\s\S]*border-color: var\(--pricing-electric\)/);
  assert.match(styles, /\.jyg-tasks-page \.jyg-membership-card:last-child[\s\S]*border-color: var\(--pricing-electric\)/);
});

test("pricing cards share the annual-member cyan border treatment", () => {
  const styles = readFileSync("src/app/(frontend)/prototype.css", "utf8");
  assert.match(styles, /\.jyg-tasks-page \.jyg-coin-card,[\s\S]*\.jyg-tasks-page \.jyg-membership-card \{[\s\S]*border-color: var\(--pricing-electric\);/);
  assert.match(styles, /\.jyg-tasks-page \.jyg-coin-card,[\s\S]*\.jyg-tasks-page \.jyg-membership-card \{[\s\S]*box-shadow: 0 0 28px rgba\(0, 200, 255, \.24\)/);
});

test("work playback waits for an episode click before loading and playing video", () => {
  const page = readFileSync("src/app/(frontend)/works/[slug]/page.tsx", "utf8");
  assert.match(page, /const selectedEpisodeIndex = requestedEpisodeIndex;/);
  assert.match(page, /firstEpisodeNumber/);
  assert.match(page, /<video key=\{selectedEpisode\.videoSrc\} controls autoPlay playsInline/);
  assert.match(page, /請選擇一集開始播放/);
});

test("episode download gate renders visible store buttons, close and lock icons without fill distortion", () => {
  const gate = readFileSync("src/components/prototype/episode-download-gate.tsx", "utf8");
  const styles = readFileSync("src/app/(frontend)/prototype.css", "utf8");
  assert.match(gate, /jyg-episode-gate__close/);
  assert.match(gate, /<X aria-hidden \/>/);
  assert.match(gate, /<LockKeyhole aria-hidden \/>\s*<span>\{episodeLabel\}/);
  assert.match(gate, /onClick=\{\(\) => setOpen\(false\)\}/);
  assert.match(gate, /GOOGLE_PLAY_APP_URL/);
  assert.doesNotMatch(gate, /apps\.apple\.com/);
  assert.match(gate, /jyg-episode-gate__store/);
  assert.match(gate, /jyg-episode-gate__store-button/);
  assert.match(gate, /下載二維碼/);
  assert.ok(gate.indexOf('label: "Android"') < gate.indexOf('label: "iOS"'));
  assert.doesNotMatch(gate, /查看下載說明|href="\/download"/);
  assert.match(styles, /\.jyg-episode-gate__store-button\s*\{[\s\S]*background:linear-gradient/);
  assert.match(styles, /@media \(max-width: 700px\)[\s\S]*\.jyg-episode-gate__qr-grid \{[^}]*flex-direction:column;[^}]*align-items:stretch;/);
  assert.match(styles, /@media \(max-width: 700px\)[\s\S]*\.jyg-episode-gate__qr-grid img \{ display:none; \}/);
  assert.match(styles, /@media \(max-width: 700px\)[\s\S]*\.jyg-episode-gate__store-button \{ min-width:0; \}/);
  assert.doesNotMatch(styles, /\.jyg-episode-gate__dialog\s*>\s*\.jyg-button/);
  assert.match(styles, /\.jyg-episode-gate__close svg[\s\S]*fill:none !important[\s\S]*stroke:currentColor !important/);
  assert.match(styles, /\.jyg-episode-gate__episode svg[\s\S]*fill:none !important[\s\S]*stroke:currentColor !important/);
  assert.doesNotMatch(styles, /\.jyg-episode-grid\s+svg\s*\{/);
  const card = gate.match(/<button type="button" className="jyg-episode-card[\s\S]*?<\/button>/)?.[0] ?? "";
  assert.doesNotMatch(card, /LockKeyhole/);
});

test("fixed layout editor exposes independent horizontal and vertical text position controls", () => {
  const admin = readFileSync("src/app/admin/admin-console.tsx", "utf8");
  const registry = readFileSync("backend/src/main/java/com/mydream/cms/studio/BlockRegistry.java", "utf8");
  assert.match(admin, /positionControl/);
  assert.match(admin, /水平位置/);
  assert.match(admin, /垂直位置/);
  assert.match(admin, /mobileBackgroundPosition/);
  assert.match(admin, /style\("verticalAlign"/);
  assert.match(registry, /"align", "verticalAlign", "maxWidth"/);
});

test("drama cards omit the synopsis and its reserved space", () => {
  const styles = readFileSync("src/app/(frontend)/prototype.css", "utf8");
  const card = readFileSync("src/components/prototype/home-work-card.tsx", "utf8");
  assert.doesNotMatch(card, /work\.description/);
  assert.doesNotMatch(styles, /\.jyg-drama-card \{[^}]*min-height:[1-9]/);
  assert.match(styles, /\.jyg-drama-card__body \{[^}]*flex:1/);
});

test("Batch 2 routes and motion targets remain safe and reduced-motion aware", () => {
  assert.ok(v2InternalRoutes.every((href) => href.startsWith("/") && !href.startsWith("//") && !href.includes("#")));
  assert.equal(shouldInitializePageMotion({ pathname: "/explore", reviewMode: false, reducedMotion: false }), true);
  assert.equal(shouldInitializePageMotion({ pathname: "/drama/published-drama", reviewMode: false, reducedMotion: false }), true);
  assert.equal(shouldInitializePageMotion({ pathname: "/explore", reviewMode: false, reducedMotion: true }), false);
  assert.equal(shouldInitializePageMotion({ pathname: "/admin", reviewMode: false, reducedMotion: false }), false);
});

test("legal pages keep self-canonical noindex metadata", () => {
  for (const slug of ["privacy", "terms"] as const) {
    const source = readFileSync(`src/app/(frontend)/${slug}/page.tsx`, "utf8");
    assert.match(source, new RegExp(`canonical: "/${slug}"`));
    assert.match(source, /index: false, follow: true/);
  }
});

test("Batch 2 UI does not introduce hash-only links", () => {
  const sources = [
    "src/app/(frontend)/explore/page.tsx",
    "src/app/(frontend)/creator/page.tsx",
    "src/app/(frontend)/journal/page.tsx",
    "src/app/(frontend)/about/page.tsx",
    "src/app/(frontend)/download/page.tsx",
    "src/app/(frontend)/business/page.tsx",
  ].map((file) => readFileSync(file, "utf8")).join("\n");
  assert.equal(/href=["']#["']/.test(sources), false);
});

test("work detail hero omits the disabled favorite module", () => {
  const source = readFileSync("src/app/(frontend)/works/[slug]/page.tsx", "utf8");
  const styles = readFileSync("src/app/(frontend)/prototype.css", "utf8");
  assert.doesNotMatch(source, /收藏功能將在後續階段開放/);
  assert.doesNotMatch(source, /<Heart/);
  assert.match(source, /<figure className="jyg-work-detail-cover">\s*<Image[\s\S]*?\/>\s*<\/figure>/);
  assert.match(source, /播放正片/);
  assert.doesNotMatch(source, /CMS MANAGED CONTENT/);
  assert.match(styles, /\.jyg-work-detail-hero__grid[\s\S]*grid-template-columns:minmax\(260px,280px\) minmax\(0,1fr\)[\s\S]*align-items:center/);
  assert.match(styles, /\.jyg-work-detail-actions \.jyg-button--gold[\s\S]*min-width:170px[\s\S]*min-height:48px/);
});

test("news editor exposes the company dynamics category", () => {
  const source = readFileSync("src/app/admin/admin-console.tsx", "utf8");
  const categories = readFileSync("src/features/jyg/news-categories.ts", "utf8");
  assert.match(source, /NEWS_CATEGORY_LABELS/);
  assert.match(source, /newsCategoryId/);
  assert.match(categories, /公司動態/);
  assert.match(categories, /company-news/);
});

test("news public filters omit SEO while preserving the stored editor category", () => {
  const browser = readFileSync("src/components/prototype/news-browser.tsx", "utf8");
  const editor = readFileSync("src/app/admin/admin-console.tsx", "utf8");
  const categories = readFileSync("src/features/jyg/news-categories.ts", "utf8");
  assert.match(browser, /PUBLIC_NEWS_CATEGORY_LABELS\.map/);
  assert.match(editor, /NEWS_CATEGORY_LABELS/);
  assert.deepEqual(PUBLIC_NEWS_CATEGORY_LABELS.map(newsCategoryLabel), ["活動公告", "平台消息", "品牌動態", "公司動態"]);
  assert.ok(NEWS_CATEGORY_LABELS.includes("SEO文章"));
  for (const label of ["活動公告", "SEO文章", "平台消息", "品牌動態", "公司动态"]) {
    assert.match(categories, new RegExp(label));
  }
});

test("SEO article media preserves portrait and square image ratios", () => {
  const styles = readFileSync("src/app/globals.css", "utf8");
  const adminStyles = readFileSync("src/app/admin/admin.css", "utf8");
  assert.match(styles, /\.v2-article-cover \{[^}]*aspect-ratio: auto;/);
  assert.match(styles, /\.v2-article-cover img \{ object-fit: contain; \}/);
  assert.match(styles, /\.v2-article-inline-image img \{[^}]*height: auto;/);
  assert.match(adminStyles, /\.admin-news-preview>img\{[^}]*object-fit:contain/);
});

test("home category discovery omits the eyebrow and helper description", () => {
  const source = readFileSync("src/components/prototype/jyg-home.tsx", "utf8");
  assert.doesNotMatch(source, /WORK CATEGORIES/);
  assert.doesNotMatch(source, /切換題材，快速整理適合現在觀看的 AI 原創內容/);
  assert.doesNotMatch(source, /categoryProps\.eyebrow/);
  assert.doesNotMatch(source, /categoryProps\.description/);
});

test("home hero supports a managed looping background animation", () => {
  const home = readFileSync("src/components/prototype/jyg-home.tsx", "utf8");
  const hero = readFileSync("src/components/prototype/hero-background.tsx", "utf8");
  const model = readFileSync("src/features/jyg/home-hero-model.ts", "utf8");
  const admin = readFileSync("src/app/admin/admin-console.tsx", "utf8");
  assert.match(home, /video=\{hero\.backgroundVideo\}/);
  assert.match(hero, /autoPlay[\s\S]*muted[\s\S]*loop[\s\S]*playsInline/);
  const styles = readFileSync("src/app/(frontend)/prototype.css", "utf8");
  assert.match(styles, /\.jyg-global-hero-background--home \.jyg-global-hero-background__video\s*\{[^}]*inset:\s*0;[^}]*width:\s*100%/);
  assert.match(styles, /\.jyg-global-hero-background--home \.jyg-global-hero-background__video\s*\{[^}]*object-fit:\s*cover/);
  assert.doesNotMatch(styles, /\.jyg-global-hero-background--home \.jyg-global-hero-background__video\s*\{[^}]*object-fit:\s*fill/);
  assert.match(styles, /\.jyg-global-hero-background--home \.jyg-global-hero-background__video\s*\{[^}]*background:\s*transparent/);
  assert.doesNotMatch(styles, /\.jyg-global-hero-background--home \.jyg-global-hero-background__video\s*\{[^}]*background:\s*#020711/);
  assert.match(model, /backgroundVideoUrl/);
  assert.match(admin, /backgroundVideoMediaId/);
  assert.doesNotMatch(model, /home-hero-animation\.mp4/);
  assert.match(admin, /不使用視頻（使用背景圖片）/);
});

test("prebuilt web deployment includes public hero media assets", () => {
  const dockerfile = readFileSync("deploy/Dockerfile.web-prebuilt", "utf8");
  assert.match(dockerfile, /COPY --chown=mydream:mydream public\/assets \.\/public\/assets/);
  assert.match(dockerfile, /COPY --chown=mydream:mydream public\/prototype\/jyg\/character-lineup\.webp \.\/public\/prototype\/jyg\/character-lineup\.webp/);
});

test("production web runtime keeps enough memory headroom and probes a lightweight endpoint", async () => {
  const compose = readFileSync("deploy/compose.production.yaml", "utf8");
  assert.match(compose, /web:[\s\S]*mem_limit:\s*512m/);
  assert.match(compose, /NODE_OPTIONS:\s*--max-old-space-size=320/);
  assert.match(compose, /healthcheck:[\s\S]*\/healthz/);
  assert.match(compose, /AbortSignal\.timeout\(2000\)/);
  assert.match(compose, /interval:\s*30s/);
  assert.match(compose, /timeout:\s*3s/);
  assert.doesNotMatch(compose, /healthcheck:[\s\S]{0,500}fetch\('http:\/\/127\.0\.0\.1:3000\/'\)/);
  assert.equal(existsSync("src/app/healthz/route.ts"), true);
  const response = getHealth();
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "ok");
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("CMS rendering work is bounded so a slow dependency cannot pin the web process", () => {
  const client = readFileSync("src/content/cms/java-cms-client.ts", "utf8");
  const home = readFileSync("src/app/(frontend)/page.tsx", "utf8");
  assert.match(client, /CMS_REQUEST_TIMEOUT_MS\s*=\s*3000/);
  assert.match(client, /signal:\s*AbortSignal\.timeout\(CMS_REQUEST_TIMEOUT_MS\)/);
  // Category ranking needs more than the twelve featured cards; the fetch
  // remains capped and shares the CMS request timeout.
  assert.match(home, /getManagedContent\("work",\s*"zh-Hant",\s*200\)/);
});

test("navigation occupies its own sticky layout row above hero media", () => {
  const styles = readFileSync("src/app/(frontend)/prototype.css", "utf8");
  assert.match(styles, /\.jyg-navbar\s*\{[^}]*position:\s*sticky/);
  assert.doesNotMatch(styles, /\.jyg-navbar\s*\{[^}]*position:\s*fixed/);
  const globalStyles = readFileSync("src/app/globals.css", "utf8");
  assert.match(globalStyles, /\.site-shell\s*\{[^}]*overflow-x:\s*clip[^}]*overflow-y:\s*visible/);
  assert.doesNotMatch(globalStyles, /\.site-shell\s*\{[^}]*overflow:\s*clip\s*;/);
});

test("home hero keeps the source video bright with a restrained default overlay", () => {
  const home = readFileSync("src/components/prototype/jyg-home.tsx", "utf8");
  const admin = readFileSync("src/app/admin/admin-console.tsx", "utf8");
  assert.match(home, /hero\.style\?\.overlay \?\? 0\.3/);
  assert.match(admin, /numberField\("overlay", 0\.3, 0, 1, "背景遮罩（0-1）"\)/);
});

test("AI universe exposes CRUD-managed video, tutorial and inspiration content", () => {
  const admin = readFileSync("src/app/admin/admin-console.tsx", "utf8");
  const universe = readFileSync("src/app/(frontend)/universe/page.tsx", "utf8");
  const hub = readFileSync("src/components/prototype/jyg-ai-universe-hub.tsx", "utf8");
  assert.match(admin, /UniverseContentType = "original-video" \| "tutorial" \| "inspiration"/);
  assert.match(admin, /AI UNIVERSE CONTENT CRUD/);
  assert.match(admin, /videoMediaId/);
  assert.match(admin, /選擇封面照片（可選）/);
  assert.match(admin, /coverMediaId: form\.coverMediaId \|\| null/);
  assert.match(universe, /getManagedContent\("tutorial"/);
  assert.match(universe, /getManagedContent\("inspiration"/);
  assert.match(hub, /managedTutorials/);
  assert.match(hub, /managedInspirations/);
  assert.doesNotMatch(admin, /UniverseContentType = [^;]*prompt/);
});

test("AI creation center hero keeps its artwork visible with a restrained navy treatment", () => {
  const styles = readFileSync("src/app/(frontend)/prototype.css", "utf8");
  assert.match(styles, /\.jyg-global-hero-background--universe \.jyg-global-hero-background__overlay \{\s*background:\s*linear-gradient\(90deg, rgba\(2, 8, 21, \.35\)/);
  assert.match(styles, /rgba\(2, 8, 21, \.04\)/);
});

test("AI creation center background uses the same hero ratio as other navigation pages", () => {
  const styles = readFileSync("src/app/(frontend)/prototype.css", "utf8");

  assert.match(styles, /--jyg-hero-height-desktop:\s*620px;/);
  assert.match(styles, /--jyg-hero-height-mobile:\s*560px;/);
  assert.doesNotMatch(styles, /\.jyg-ai-hub-page\s*\{[^}]*--jyg-hero-height-/s);
  assert.doesNotMatch(styles, /\.jyg-ai-hub-page \.jyg-ai-hub-hero\s*\{[^}]*height:/s);
});

test("primary navigation heroes keep one shared first-screen height regardless of CMS values", () => {
  const styles = readFileSync("src/app/(frontend)/prototype.css", "utf8");
  const managedStyles = readFileSync("src/content/cms/managed-page-style.ts", "utf8");
  const visualRuntime = readFileSync("src/components/cms/visual-runtime.tsx", "utf8");
  const home = readFileSync("src/components/prototype/jyg-home.tsx", "utf8");

  assert.match(
    styles,
    /:is\(\s*\.jyg-home-hero,\s*\.jyg-ai-hub-hero,\s*\.jyg-pricing-hero,[\s\S]*?\)\s*\{[\s\S]*?height:\s*var\(--jyg-hero-height-desktop\);[\s\S]*?min-height:\s*var\(--jyg-hero-height-desktop\);/,
  );
  assert.match(managedStyles, /\.\.\.\(!options\.hero && minHeight !== undefined \? \{ minHeight \} : \{\}\)/);
  assert.match(managedStyles, /\.\.\.\(!options\.hero && height !== undefined \? \{ height \} : \{\}\)/);
  assert.match(visualRuntime, /const isHero = block\.type === "hero";/);
  assert.match(visualRuntime, /section\.style\.minHeight = !isHero && finite\(block\.style\.minHeight\)/);
  assert.match(visualRuntime, /section\.style\.height = !isHero && finite\(block\.style\.height\)/);
  assert.doesNotMatch(home, /--cms-hero-height/);
});

test("AI creation center links the original film rail to the existing library", () => {
  const hub = readFileSync("src/components/prototype/jyg-ai-universe-hub.tsx", "utf8");
  assert.match(hub, /<Link href="\/universe\/videos">查看更多/);
});

test("AI creation center uses the reference hub layout without adding new film records", () => {
  const hub = readFileSync("src/components/prototype/jyg-ai-universe-hub.tsx", "utf8");
  const styles = readFileSync("src/app/(frontend)/prototype.css", "utf8");
  const migration = readFileSync("backend/src/main/resources/db/migration/V19__ai_creation_center_layout.sql", "utf8");
  assert.match(hub, /ai-creation-center-hero-v1\.png/);
  assert.match(hub, /id="ai-originals"/);
  assert.match(hub, /id="ai-tutorials"/);
  assert.match(hub, /jyg-ai-hub-community/);
  assert.doesNotMatch(hub, /jyg-ai-hub-quicklinks/);
  assert.match(hub, /contents\.filter\(\(item\) => item\.type === "original"\)/);
  assert.match(hub, /contents\.filter\(\(item\) => item\.type === "tutorial"\)/);
  assert.match(styles, /\.jyg-ai-hub-content-rail \{[^}]*grid-auto-flow: column/);
  assert.match(styles, /\.jyg-ai-hub-community__panel \{[^}]*grid-template-columns:/);
  assert.match(migration, /page_row\.path = '\/universe'/);
  assert.doesNotMatch(migration, /INSERT INTO cms_content/);
});

test("global logo and AI creation hero do not depend on the CMS media proxy", () => {
  const brand = readFileSync("src/data/brand-tokens.ts", "utf8");
  const hub = readFileSync("src/components/prototype/jyg-ai-universe-hub.tsx", "utf8");
  const migration = readFileSync("backend/src/main/resources/db/migration/V22__public_ai_creation_hero_asset.sql", "utf8");

  assert.match(brand, /original: "\/brand\/logo-original\.png"/);
  assert.match(brand, /transparent: "\/brand\/logo-transparent\.png"/);
  assert.match(brand, /mark: "\/brand\/logo-mark\.png"/);
  assert.match(hub, /"\/cms-media\/assets\/jyg\/ai-creation-center-hero-v1\.png"/);
  assert.match(hub, /"\/assets\/jyg\/ai-creation-center-hero-v1\.png"/);
  assert.match(migration, /'\$\.backgroundUrl', '\/assets\/jyg\/ai-creation-center-hero-v1\.png'/);
  assert.match(migration, /'\/cms-media\/assets\/jyg\/ai-creation-center-hero-v1\.png'/);
});

test("pricing hero keeps the uploaded background visible on the left", () => {
  const styles = readFileSync("src/app/(frontend)/prototype.css", "utf8");
  const pricingOverlay = styles.match(/\.jyg-global-hero-background--pricing \.jyg-global-hero-background__overlay \{([\s\S]*?)\n\}/)?.[1] ?? "";
  assert.match(pricingOverlay, /rgba\(2, 7, 17, \.48\)/);
  assert.doesNotMatch(pricingOverlay, /rgba\(2, 7, 17, \.9[0-9]\)/);
});

test("home hero video fills the hero box without non-uniform scaling", () => {
  const styles = readFileSync("src/app/(frontend)/prototype.css", "utf8");
  const homeVideo = styles.match(/\.jyg-global-hero-background--home \.jyg-global-hero-background__video \{([\s\S]*?)\}/)?.[1] ?? "";
  assert.match(homeVideo, /inset:\s*0;/);
  assert.match(homeVideo, /width:\s*100%;/);
  assert.doesNotMatch(homeVideo, /min\(1360px/);
});

test("desktop home hero covers the full row without stretching people wider", () => {
  const styles = readFileSync("src/app/(frontend)/prototype.css", "utf8");
  const homeVideo = styles.match(/\.jyg-global-hero-background--home \.jyg-global-hero-background__video \{([\s\S]*?)\}/)?.[1] ?? "";
  assert.match(homeVideo, /object-fit:\s*cover;/);
  assert.doesNotMatch(homeVideo, /object-fit:\s*fill;/);
  assert.match(homeVideo, /object-position:\s*var\(--jyg-hero-position\);/);
  assert.match(homeVideo, /background:\s*transparent;/);
});

test("AI universe hero keeps CMS field styles during client navigation", () => {
  const universe = readFileSync("src/components/prototype/jyg-ai-universe-hub.tsx", "utf8");
  assert.deepEqual(managedFieldStyle({ style: { titleColor: "#f4c542", titleFontSize: 82 } } as never, "title"), {
    color: "#f4c542",
    fontSize: 82,
  });
  assert.doesNotMatch(universe, /heroProps\.eyebrow/);
  assert.match(universe, /style=\{managedFieldStyle\(heroBlock, "title"\)\}/);
});

test("free Creator ID actions open the dedicated registration application", () => {
  const landing = readFileSync("src/components/creator-id/creator-id-landing.tsx", "utf8");
  const showcase = readFileSync("src/components/creator-id/creator-id-showcase.tsx", "utf8");
  const application = readFileSync("src/app/(frontend)/creator-id/apply/page.tsx", "utf8");
  assert.match(landing, /href=\"\/creator-id\/apply\"/);
  assert.match(showcase, /href=\"\/creator-id\/apply\"/);
  assert.match(application, /CreatorIdApplication/);
});

test("AI creation center follow-up sections are CMS-managed", () => {
  const hub = readFileSync("src/components/prototype/jyg-ai-universe-hub.tsx", "utf8");
  const migration = readFileSync("backend/src/main/resources/db/migration/V23__ai_creation_center_followup_blocks.sql", "utf8");
  const admin = readFileSync("src/app/admin/admin-console.tsx", "utf8");

  for (const zone of ["tutorials", "community"]) {
    assert.match(hub, new RegExp(`data-cms-zone=\\"${zone}\\"`));
    assert.match(migration, new RegExp(`'${zone}'`));
  }
  assert.match(hub, /managedTutorials/);
  assert.doesNotMatch(hub, /managedQuickLinks|data-cms-zone="quicklinks"/);
  assert.match(admin, /page.path === "\/universe" && block.zone === "quicklinks"/);
});

test("episode admin supports batch creation with optional video upload", () => {
  const admin = readFileSync("src/app/admin/admin-console.tsx", "utf8");
  const styles = readFileSync("src/app/admin/admin.css", "utf8");
  assert.match(admin, /批量添加劇集/);
  assert.match(admin, /BatchEpisodeUploader/);
  assert.match(admin, /multiple/);
  assert.match(admin, /先建資料，視頻可後補/);
  assert.match(admin, /\/admin-api\/v1\/sites\/\$\{site\.id\}\/media/);
  assert.match(admin, /type: "episode"/);
  assert.match(admin, /type: "episode-of"/);
  assert.match(styles, /admin-batch-file-list/);
});

test("batch episode suggestion ignores archived records and reports duplicate numbers before submit", () => {
  const records = [
    { type: "episode", relatedWorkId: "work-1", episodeNumber: "1", archived: false },
    { type: "episode", relatedWorkId: "work-1", episodeNumber: "7", archived: false },
    { type: "episode", relatedWorkId: "work-1", episodeNumber: "82", archived: true },
    { type: "episode", relatedWorkId: "work-2", episodeNumber: "99", archived: false },
  ];
  assert.equal(nextVisibleEpisodeNumber(records, "work-1"), 8);
  assert.deepEqual(duplicateEpisodeNumbers(records, "work-1", 7, 2), [7]);
  assert.deepEqual(duplicateEpisodeNumbers(records, "work-1", 82, 1), []);

  const studio = readFileSync("backend/src/main/java/com/mydream/cms/studio/StudioFacade.java", "utf8");
  assert.match(studio, /content_type='episode'[\s\S]*-archived-/);
});

test("all fixed CMS pages render published blocks instead of hard-coded editor fallbacks", () => {
  for (const route of ["contact", "tasks", "news"] as const) {
    const source = readFileSync(`src/app/(frontend)/${route}/page.tsx`, "utf8");
    assert.match(source, new RegExp(`getManagedPage\\(\"/${route}\", \"zh-Hant\"\\)`));
  }

  const contact = readFileSync("src/app/(frontend)/contact/page.tsx", "utf8");
  assert.match(contact, /image=\{text\(hero\.backgroundUrl/);
  assert.match(contact, /heading=\{text\(contactForm\.title/);

  const tasks = readFileSync("src/app/(frontend)/tasks/page.tsx", "utf8");
  assert.match(tasks, /image=\{text\(hero\.backgroundUrl/);
  assert.match(tasks, /data-cms-field="title">\{text\(coins\.title/);
  assert.match(tasks, /data-cms-field="title">\{text\(membership\.title/);

  const news = readFileSync("src/app/(frontend)/news/page.tsx", "utf8");
  assert.match(news, /image=\{text\(hero\.backgroundUrl/);
  assert.match(news, /data-cms-field="title">\{text\(library\.title/);
  assert.match(news, /data-cms-field="description">\{text\(library\.description/);
});

test("CMS visual runtime applies every fixed-layout editor style and replaces responsive images", () => {
  const runtime = readFileSync("src/components/cms/visual-runtime.tsx", "utf8");
  const admin = readFileSync("src/app/admin/admin-console.tsx", "utf8");
  const managedStyle = readFileSync("src/content/cms/managed-page-style.ts", "utf8");
  assert.doesNotMatch(runtime, /if \(apiBase\) \{/);
  assert.match(runtime, /const base = apiBase\.replace/);
  assert.match(runtime, /removeAttribute\("srcset"\)/);
  assert.match(runtime, /--cms-hero-overlay/);
  assert.match(runtime, /--cms-hero-copy-width/);
  assert.match(runtime, /--jyg-hero-position-mobile/);
  assert.match(runtime, /section\.dataset\.align/);
  assert.match(runtime, /section\.style\.height/);
  assert.match(runtime, /verticalAlign/);
  assert.match(runtime, /--cms-text-vertical/);
  assert.match(admin, /垂直位置/);
  assert.match(admin, /style\("verticalAlign"/);
  assert.match(managedStyle, /--cms-text-content/);
  assert.match(runtime, /--cms-text-offset/);
});

test("home section vertical alignment moves title-only headings within their section", () => {
  const home = readFileSync("src/components/prototype/jyg-home.tsx", "utf8");
  const styles = readFileSync("src/app/(frontend)/prototype.css", "utf8");
  assert.match(home, /function textOffset\(/);
  assert.match(home, /--cms-text-offset/);
  assert.doesNotMatch(styles, /\.jyg-work-discovery__head \{ transform:translateY\(var\(--cms-text-offset/);
  assert.match(styles, /\.jyg-pricing-section-head > div[\s\S]*--cms-title-offset/);
  assert.doesNotMatch(styles, /\[data-cms-zone\] \[data-cms-field="title"\].*--cms-title-offset/);
  assert.match(home, /Math\.min\(Math\.max\(paddingTop - 12, 0\), 64\)/);
});

test("CMS visual runtime refetches managed page content after client navigation", () => {
  const runtime = readFileSync("src/components/cms/visual-runtime.tsx", "utf8");
  assert.match(runtime, /import \{ useEffect \} from "react"/);
  assert.match(runtime, /import \{ usePathname \} from "next\/navigation"/);
  assert.match(runtime, /const pathname = usePathname\(\)/);
  assert.match(runtime, /new URLSearchParams\(\{ path: backgroundSettingsPath\(pathname\) \}\)/);
  assert.match(runtime, /\}, \[apiBase, siteKey, pathname\]\)/);
});

test("footer exposes the external service agreement and privacy policy actions", () => {
  const footer = readFileSync("src/components/layout/footer.tsx", "utf8");
  assert.match(footer, /https:\/\/share\.the-drama-has-a-plot\.com\/service_agreement\.html/);
  assert.match(footer, /https:\/\/share\.the-drama-has-a-plot\.com\/privacy_policy\.html/);
  assert.match(footer, /target="_blank" rel="noopener noreferrer"/);
  assert.match(footer, /brand-footer__legal-links/);
});

test("managed footer refreshes global settings after returning from the admin tab", () => {
  const layout = readFileSync("src/app/(frontend)/layout.tsx", "utf8");
  const runtimeFooter = readFileSync("src/components/layout/managed-footer.tsx", "utf8");
  assert.match(layout, /<ManagedFooter\s+initialSettings=\{footerSettings\}/);
  assert.match(runtimeFooter, /usePathname\(\)/);
  assert.match(runtimeFooter, /window\.addEventListener\("focus", refresh\)/);
  assert.match(runtimeFooter, /document\.addEventListener\("visibilitychange", handleVisibilityChange\)/);
  assert.match(runtimeFooter, /cache: "no-store"/);
  assert.match(runtimeFooter, /resolveFooterSettings\(shell\.config\?\.footer\)/);
});

test("footer brand column scales with the information frame without distorting the logo", () => {
  const footer = readFileSync("src/components/layout/footer.tsx", "utf8");

  assert.match(footer, /\.brand-footer__main\s*\{[^}]*align-items:\s*stretch;/s);
  assert.match(
    footer,
    /\.brand-footer__brand\s*\{[^}]*min-height:\s*100%;[^}]*height:\s*100%;[^}]*display:\s*flex;[^}]*flex-direction:\s*column;/s,
  );
  assert.match(footer, /\.brand-footer__information\s*\{[^}]*height:\s*100%;/s);
  assert.match(footer, /\.brand-footer__logo-link\s*\{[^}]*flex:\s*1 1 auto;[^}]*min-height:\s*0;[^}]*align-items:\s*flex-start;/s);
  assert.match(footer, /\.brand-footer__logo\s*\{[^}]*width:\s*auto;[^}]*height:\s*100%;[^}]*max-width:\s*100%;[^}]*max-height:\s*210px;[^}]*object-fit:\s*contain;/s);
  assert.match(footer, /\.brand-footer__brand h2\s*\{[^}]*margin:\s*12px 0 9px;/s);
  assert.match(footer, /@media \(max-width:\s*700px\)[\s\S]*\.brand-footer__logo-link\s*\{[^}]*flex:\s*none;[^}]*min-height:\s*auto;/s);
  assert.match(footer, /@media \(max-width:\s*700px\)[\s\S]*\.brand-footer__logo\s*\{[^}]*width:\s*82px;[^}]*height:\s*auto;/s);
});

test("frontend omits the cookie consent popup", () => {
  const banner = readFileSync("src/components/consent/consent-banner.tsx", "utf8");
  const styles = readFileSync("src/app/globals.css", "utf8");
  assert.doesNotMatch(banner, /className="consent-banner"/);
  assert.doesNotMatch(banner, /className="consent-preferences"/);
  assert.doesNotMatch(banner, /接受分析|拒絕分析|偏好設定與隱私權政策/);
  assert.doesNotMatch(styles, /\.consent-banner\s*\{/);
  assert.doesNotMatch(styles, /\.consent-preferences\s*\{/);
});

test("CMS visual runtime clears deleted fields after route navigation", () => {
  const runtime = readFileSync("src/components/cms/visual-runtime.tsx", "utf8");
  assert.match(runtime, /querySelectorAll<HTMLElement>\("\[data-cms-field\]"\)/);
  assert.match(runtime, /hasOwnProperty\.call\(props, field\)/);
  assert.match(runtime, /target\.textContent = ""/);
});

test("CMS visual runtime ignores stale responses after navigation", () => {
  const runtime = readFileSync("src/components/cms/visual-runtime.tsx", "utf8");
  assert.match(runtime, /new AbortController\(\)/);
  assert.match(runtime, /signal: controller\.signal/);
  assert.match(runtime, /if \(active && page && !hasDraftPreview\) observePage\(page\)/);
  assert.match(runtime, /controller\.abort\(\)/);
});

test("CMS visual runtime reapplies the destination page after its DOM mounts", () => {
  const runtime = readFileSync("src/components/cms/visual-runtime.tsx", "utf8");
  assert.match(runtime, /new MutationObserver/);
  assert.match(runtime, /observer\.disconnect\(\)[\s\S]*applyPage\(page(?:, activeZone)?\)[\s\S]*observer\.observe/);
  assert.match(runtime, /observer\?\.disconnect\(\)/);
});

test("free work episodes use the same dark treatment as the remaining episode buttons", () => {
  const page = readFileSync("src/app/(frontend)/works/[slug]/page.tsx", "utf8");
  const styles = readFileSync("src/app/(frontend)/prototype.css", "utf8");
  assert.match(page, /episodeNumber <= item\.freeEpisodeCount \? "is-free"/);
  assert.doesNotMatch(styles, /\.jyg-episode-grid\.jyg-episode-grid--compact > a\.is-free\s*\{/);
  assert.match(styles, /> a \{ border-color:rgba\(244,183,63,\.3\); background:#181613; color:#f6ca67; \}/);
  assert.match(styles, /> a span,[^\n]+> \.jyg-episode-card span \{ color:#f6ca67;/);
});

test("navbar omits the standalone Google Play action", () => {
  const navbar = readFileSync("src/components/layout/navbar.tsx", "utf8");
  assert.doesNotMatch(navbar, /jyg-nav-action--store|jyg-mobile-google|>Google Play<|GOOGLE_PLAY_APP_URL/);
});

test("new work creation derives an unused slug instead of reusing new-work", () => {
  const admin = readFileSync("src/app/admin/admin-console.tsx", "utf8");
  assert.equal(nextAvailableContentSlug("new-work", []), "new-work");
  assert.equal(nextAvailableContentSlug("new-work", ["new-work"]), "new-work-2");
  assert.equal(nextAvailableContentSlug("new-work", ["new-work", "new-work-2"]), "new-work-3");
  assert.match(admin, /nextAvailableContentSlug\("new-work", existingSlugs\)/);
  assert.match(admin, /existingSlugs\.includes\(form\.slug\)/);
});

test("AI universe content creation derives an unused slug instead of reusing new-universe-content", () => {
  const admin = readFileSync("src/app/admin/admin-console.tsx", "utf8");
  assert.equal(nextAvailableContentSlug("new-universe-content", []), "new-universe-content");
  assert.equal(nextAvailableContentSlug("new-universe-content", ["new-universe-content"]), "new-universe-content-2");
  assert.equal(nextAvailableContentSlug("new-universe-content", ["new-universe-content", "new-universe-content-2"]), "new-universe-content-3");
  assert.match(admin, /nextAvailableContentSlug\("new-universe-content", existingSlugs\)/);
  assert.match(admin, /UniverseContentEditor[^\n]+existingSlugs=\{content\.filter\(\(item\) => item\.type === type\)\.map\(\(item\) => item\.slug\)\}/);
});

test("browser favicon uses the transparent MD brand mark", () => {
  const favicon = readFileSync("src/app/favicon.ico");
  assert.equal(favicon.readUInt16LE(0), 0);
  assert.equal(favicon.readUInt16LE(2), 1);
  assert.equal(favicon.readUInt16LE(4), 1);
  assert.deepEqual([...favicon.subarray(22, 30)], [137, 80, 78, 71, 13, 10, 26, 10]);
});

test("managed fixed sections expose descriptions and shared style mappings", () => {
  const universe = readFileSync("src/components/prototype/jyg-ai-universe-hub.tsx", "utf8");
  assert.match(universe, /data-cms-field="description">\{text\(categoriesProps\.description/);
  assert.match(universe, /data-cms-field="description">\{text\(contentProps\.description/);

  for (const file of [
    "src/app/(frontend)/contact/page.tsx",
    "src/app/(frontend)/tasks/page.tsx",
    "src/app/(frontend)/news/page.tsx",
    "src/app/(frontend)/download/page.tsx",
    "src/components/prototype/jyg-ai-universe-hub.tsx",
  ]) {
    assert.match(readFileSync(file, "utf8"), /managedBlockStyle/);
  }
});
