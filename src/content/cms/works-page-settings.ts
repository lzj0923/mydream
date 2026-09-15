import type { EditableHomeBlock } from "./home-section-settings";

export const allWorksHeroBackground = "/assets/jyg/about-hero-journey-to-west-hd.png";

export const worksHeroText = {
  title: "全部作品", subtitle: "探索屬於你的精彩故事",
  description: "來自劇有梗 MY DREAM 的原創內容\nAI 短劇・漫劇・動畫・原創 IP 盡在這裡",
  featureOneTitle: "精彩劇集", featureOneDescription: "持續更新",
  featureTwoTitle: "多元題材", featureTwoDescription: "滿足不同喜好",
  featureThreeTitle: "沉浸體驗", featureThreeDescription: "開啟全新視界",
};

export function worksHeroProps(props: Record<string, unknown>): Record<string, unknown> {
  return { ...worksHeroText, ...props, description: props.description === "集中瀏覽 MY DREAM 已公開的 AI 短劇、漫劇、動畫與原創 IP 作品。" ? worksHeroText.description : props.description ?? worksHeroText.description };
}

export function defaultWorksSectionBlocks(): EditableHomeBlock[] {
  return [
    {
      type: "hero", schemaVersion: 1, zone: "hero", order: 0, visible: true,
      props: {
        ...worksHeroText,
        backgroundMediaId: "", backgroundUrl: allWorksHeroBackground,
        backgroundPosition: "70% center", mobileBackgroundPosition: "70% center",
      },
      style: {},
    },
    {
      type: "content-grid", schemaVersion: 1, zone: "works-library", order: 1, visible: true,
      props: {
        title: "全部作品", description: "選擇一部作品，查看介紹、劇集與最新內容。",
        backgroundMediaId: "", backgroundUrl: "", backgroundPosition: "center center",
      },
      style: {},
    },
  ];
}
