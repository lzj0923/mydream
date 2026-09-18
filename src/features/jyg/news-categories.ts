export const NEWS_CATEGORY_LABELS = [
  "活動公告",
  "SEO文章",
  "平台消息",
  "品牌動態",
  "公司动态",
] as const;

export type NewsCategoryLabel = typeof NEWS_CATEGORY_LABELS[number];

// Keep the stored category available in the editor, but omit its public filter.
export const PUBLIC_NEWS_CATEGORY_LABELS = NEWS_CATEGORY_LABELS.filter((label) => label !== "SEO文章");

export function newsCategoryLabel(value: string): string {
  return value === NEWS_CATEGORY_LABELS[4] ? "公司動態" : value;
}

export function newsCategoryId(label: string): string {
  if (label === "活動公告") return "activity-announcement";
  if (label === "SEO文章") return "seo-article";
  if (label === "平台消息") return "platform-news";
  return "company-news";
}
