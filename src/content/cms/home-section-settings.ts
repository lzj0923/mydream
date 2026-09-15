import { navigationHeroProps } from "./navigation-hero";
import { backgroundPages, defaultBackgroundBlocks } from "./background-page-settings";
import { defaultProtectionBlocks, protectionPagePath } from "./protection-page-settings";
import type { CmsPage } from "@/content/cms/java-cms-client";
import { defaultWorksSectionBlocks, worksHeroProps } from "./works-page-settings";

export type EditableHomeBlock = {
  id?: string;
  type: string;
  schemaVersion: number;
  zone: string;
  order: number;
  visible: boolean;
  props: Record<string, unknown>;
  style: Record<string, unknown>;
};

export const defaultCategorySectionBlock: EditableHomeBlock = {
  type: "category-tabs",
  schemaVersion: 1,
  zone: "main",
  order: 2,
  visible: true,
  props: {
    eyebrow: "WORK CATEGORIES",
    title: "按分類探索作品",
    description: "切換題材，快速整理適合現在觀看的 AI 原創內容。",
    categoryLabels: "全部,古風,都市,漫劇,奇幻,穿越,重生,懸疑,宮鬥宅鬥,女性成長,逆襲,校園,腦洞,現代",
    backgroundUrl: "",
    backgroundPosition: "center center",
  },
  style: {
    titleColor: "#f4c542",
    descriptionColor: "#aabbd0",
    eyebrowColor: "#19bfff",
    titleFontSize: 34,
    backgroundColor: "#07101d",
    paddingTop: 72,
    paddingBottom: 72,
    columns: 6,
    gap: 12,
    align: "left",
  },
};

export const defaultAboutSectionBlocks: EditableHomeBlock[] = [
  {
    type: "hero", schemaVersion: 1, zone: "hero", order: 0, visible: true,
    props: { eyebrow: "ABOUT MY DREAM", title: "讓 AI 創造故事，", subtitle: "讓世界愛上原創角色。", description: "My Dream 致力打造全球 AI 原創 IP 娛樂平台，\n通過 AI 技術結合故事、角色與世界觀，\n創造漫畫、漫劇、動畫、音樂與互動內容。", actionLabel: "認識 My Dream", actionHref: "/universe", backgroundMediaId: "962b49b5-c217-36cf-a7d9-48ff8405837c", backgroundUrl: "/cms-media/assets/jyg/about-hero-original-world-hd.png", backgroundPosition: "center center", mobileBackgroundPosition: "56% center" },
    style: { titleColor: "#ffffff", textColor: "#ffd16f", descriptionColor: "#c7d0df", eyebrowColor: "#f4bd4d", titleFontSize: 53, minHeight: 590, copyWidth: 570, overlay: 0.72, align: "left" },
  },
  {
    type: "rich-text", schemaVersion: 1, zone: "story", order: 1, visible: true,
    props: { eyebrow: "BRAND STORY", title: "品牌故事", description: "娛樂產業正在迎來新的轉變。\n過去，內容的價值來自一次觀看；未來，價值來自能持續成長的角色與世界。\n\nMy Dream 不只是創造影片，而是打造具有生命力的 AI 原創 IP。", actionLabel: "認識 My Dream", actionHref: "/universe", backgroundMediaId: "6cd7b92f-c5d5-3950-9038-9bfb8a5d2472", backgroundUrl: "/cms-media/assets/generated/about-brand-story-v1.png", backgroundPosition: "center center" },
    style: { titleColor: "#f4bd4d", descriptionColor: "#c0cbd9", eyebrowColor: "#f4bd4d", titleFontSize: 36, backgroundColor: "#07101d", paddingTop: 30, paddingBottom: 30, columns: 2, gap: 14, align: "left" },
  },
  {
    type: "feature-cards", schemaVersion: 1, zone: "platform", order: 2, visible: true,
    props: { eyebrow: "OUR PLATFORM", title: "多元內容 × 學習 × 素材", description: "My Dream 提供多元內容與豐富資源，陪伴你在娛樂、學習與創作的旅程中不斷探索與成長。", cardOneTitle: "AI 短劇", cardOneDescription: "沉浸式故事娛樂體驗，原創劇情、豐富題材、多元世界觀。", cardOneAction: "立即觀看", cardOneHref: "/#ai-universe", cardOneImageMediaId: "f2ec4fdd-4b6b-3c49-9736-4cd52e75e641", cardOneImageUrl: "/cms-media/assets/v2/creator-stage.webp", cardTwoTitle: "AI 教學影片", cardTwoDescription: "從基礎到進階，涵蓋 AI 影像、配音、剪輯與特效。", cardTwoAction: "立即學習", cardTwoHref: "/universe?category=tutorial", cardTwoImageMediaId: "33e2847e-3392-3944-801c-b04111a1672b", cardTwoImageUrl: "/cms-media/assets/v2/hero-cinematic.webp", cardThreeTitle: "AI 素材庫", cardThreeDescription: "角色、場景、音效、音樂與特效等高品質素材。", cardThreeAction: "立即創作", cardThreeHref: "/universe/prompts", cardThreeImageMediaId: "c1f1df8f-3308-3331-a74a-5a7f61935eb1", cardThreeImageUrl: "/cms-media/prototype/jyg/ip-worlds.webp" },
    style: { titleColor: "#ffffff", descriptionColor: "#aebed1", eyebrowColor: "#f4bd4d", titleFontSize: 36, backgroundColor: "#07101d", paddingTop: 28, paddingBottom: 28, columns: 3, gap: 15, align: "left" },
  },
  {
    type: "cta", schemaVersion: 1, zone: "join", order: 3, visible: true,
    props: { eyebrow: "JOIN MY DREAM", title: "加入 My Dream", subtitle: "開啟你的 AI 創作之旅", description: "無論你是喜愛故事的觀眾，還是探索 AI 創作的創作者，都能在 My Dream 找到屬於自己的精彩。", actionLabel: "立即加入我們", actionHref: "/download", benefitOneTitle: "觀看精彩內容", benefitOneDescription: "沉浸於 AI 原創故事，探索更多精彩世界。", benefitTwoTitle: "學習創作技能", benefitTwoDescription: "學習 AI 工具與創作技巧，從新手到高手。", benefitThreeTitle: "分享創作靈感", benefitThreeDescription: "與創作者交流、互動，讓想法被看見。", benefitFourTitle: "實現無限創意", benefitFourDescription: "利用平台資源與工具，將想像化為現實。", backgroundUrl: "", backgroundPosition: "center center" },
    style: { titleColor: "#ffffff", textColor: "#f4bd4d", descriptionColor: "#aebed0", eyebrowColor: "#f4bd4d", titleFontSize: 34, backgroundColor: "#07101d", paddingTop: 28, paddingBottom: 28, columns: 4, gap: 12, align: "left" },
  },
  {
    type: "feature-cards", schemaVersion: 1, zone: "characters", order: 4, visible: true,
    props: { eyebrow: "OUR IP CHARACTERS", title: "原創 IP 角色", description: "每一個角色，都擁有自己的故事與靈魂，持續開啟世界觀。", cardOneTitle: "孫悟空", cardOneDescription: "桀驁不馴的齊天大聖。", cardOneImageMediaId: "", cardOneImageUrl: "/cms-media/prototype/jyg/character-lineup.webp", cardTwoTitle: "唐三藏", cardTwoDescription: "心懷慈悲的取經人。", cardTwoImageMediaId: "", cardTwoImageUrl: "/cms-media/prototype/jyg/character-lineup.webp", cardThreeTitle: "豬八戒", cardThreeDescription: "率真重情的天蓬元帥。", cardThreeImageMediaId: "", cardThreeImageUrl: "/cms-media/prototype/jyg/character-lineup.webp", cardFourTitle: "沙悟淨", cardFourDescription: "沉穩可靠的護行者。", cardFourImageMediaId: "", cardFourImageUrl: "/cms-media/prototype/jyg/character-lineup.webp", cardFiveTitle: "小白龍", cardFiveDescription: "穿梭奇幻世界的龍族角色。", cardFiveImageMediaId: "", cardFiveImageUrl: "/cms-media/prototype/jyg/character-lineup.webp", cardSixTitle: "更多角色", cardSixDescription: "敬請期待更多角色。", cardSixImageMediaId: "", cardSixImageUrl: "/cms-media/prototype/jyg/character-lineup.webp" },
    style: { titleColor: "#f6f8ff", descriptionColor: "#aebed0", eyebrowColor: "#f4bd4d", titleFontSize: 34, backgroundColor: "#020817", paddingTop: 30, paddingBottom: 30, columns: 6, gap: 10, align: "left" },
  },
  {
    type: "rich-text", schemaVersion: 1, zone: "banner", order: 5, visible: true,
    props: { eyebrow: "MY DREAM", title: "讓娛樂激發靈感，讓 AI 連結創意。", description: "", backgroundMediaId: "c1f1df8f-3308-3331-a74a-5a7f61935eb1", backgroundUrl: "/cms-media/prototype/jyg/ip-worlds.webp", backgroundPosition: "center 58%" },
    style: { titleColor: "#f4bd4d", descriptionColor: "#c0cbd9", eyebrowColor: "#ffffff", titleFontSize: 22, backgroundColor: "#020817", paddingTop: 45, paddingBottom: 45, columns: 1, gap: 0, align: "center" },
  },
];

export function ensureHomeSectionBlocks<T extends EditableHomeBlock>(path: string, blocks: T[]): EditableHomeBlock[] {
  if (backgroundPages.some(page => page.path === path) && !blocks.some(block => block.zone === "page-background")) return [...blocks, ...defaultBackgroundBlocks()];
  const normalized = blocks.map(block => {
    const props = block.zone === "hero" ? navigationHeroProps(path, block.props) : block.props;
    return props === block.props ? block : { ...block, props };
  });
  if (normalized.some((block, index) => block !== blocks[index])) blocks = normalized;
  if (path === protectionPagePath) return [...blocks,...defaultProtectionBlocks().filter(candidate=>!blocks.some(block=>block.zone===candidate.zone))];
  if (path === "/works") {
    return [...blocks, ...defaultWorksSectionBlocks().filter((candidate) => !blocks.some((block) => block.zone === candidate.zone))]
      .map(block => block.zone === "hero" ? { ...block, props: worksHeroProps(block.props) } : block)
      .sort((left, right) => left.order - right.order);
  }
  if (path === "/tasks") {
    const additions: EditableHomeBlock[] = [{
      type: "rich-text", schemaVersion: 1, zone: "consumer-rights",
      order: Math.max(-1, ...blocks.map((block) => block.order)) + 1, visible: true,
      props: { title: "消費者權益說明", backgroundMediaId: "", backgroundUrl: "", backgroundPosition: "center center" },
      style: {},
    }, {
      type: "rich-text", schemaVersion: 1, zone: "coin-usage",
      order: Math.max(-1, ...blocks.map(block => block.order)) + 2, visible: true,
      props: { title: "金幣使用說明", backgroundMediaId: "", backgroundUrl: "", backgroundPosition: "center center" },
      style: {},
    }];
    return [...blocks, ...additions.filter(candidate => !blocks.some(block => block.zone === candidate.zone))];
  }
  if (path === "/about") {
    const retained = blocks.filter((block) => ["hero", "story", "platform", "join", "characters", "banner"].includes(block.zone)).map((block) => block.zone === "banner" ? { ...block, order: 5 } : block);
    const missing = defaultAboutSectionBlocks.filter((candidate) => !retained.some((block) => block.zone === candidate.zone));
    return [...retained, ...missing.map((block) => ({ ...block, props: { ...block.props }, style: { ...block.style } }))].sort((left, right) => left.order - right.order);
  }
  if (path !== "/" || blocks.some((block) => block.type === "category-tabs")) return blocks;
  return [...blocks, { ...defaultCategorySectionBlock, props: { ...defaultCategorySectionBlock.props }, style: { ...defaultCategorySectionBlock.style } }];
}

export function findHomeBlock(page: CmsPage | null | undefined, type: string) {
  return page?.blocks.find((block) => block.type === type);
}

export function parseCategoryLabels(value: unknown, fallbacks: string[]) {
  if (typeof value !== "string") return fallbacks;
  const labels = value.split(/[，,]/).map((label) => label.trim()).filter(Boolean);
  return fallbacks.map((fallback, index) => labels[index] ?? fallback);
}
