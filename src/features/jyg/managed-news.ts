import type { CmsContent } from "@/content/cms/java-cms-client";
import type { Article, ArticleBodyBlock, SeoFields } from "@/content/types";

const stringValue = (value: unknown, fallback = "") => typeof value === "string" && value.trim() ? value.trim() : fallback;

function bodyBlocks(value: unknown): ArticleBodyBlock[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const block = entry as Record<string, unknown>;
    const id = stringValue(block.id, `content-${index + 1}`);
    const text = stringValue(block.text);
    if ((block.type === "heading1" || block.type === "heading2") && text) {
      return [{ id, type: "heading" as const, level: block.type === "heading1" ? 2 as const : 3 as const, text }];
    }
    if ((block.type === "paragraph" || block.type === "quote") && text) {
      return [{ id, type: block.type, text } as ArticleBodyBlock];
    }
    if (block.type === "image") {
      const src = stringValue(block.imageUrl);
      if (!src) return [];
      return [{ id, type: "image" as const, media: { src, alt: stringValue(block.alt, "消息正文圖片"), isPlaceholder: false }, caption: stringValue(block.caption) || undefined }];
    }
    return [];
  });
}

function seoFields(value: unknown, cover: Article["cover"]): SeoFields | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const seo = value as Record<string, unknown>;
  const title = stringValue(seo.title);
  const description = stringValue(seo.description);
  const canonicalPath = stringValue(seo.canonicalPath);
  const keywords = Array.isArray(seo.keywords) ? seo.keywords.map((item) => stringValue(item)).filter(Boolean).slice(0, 12) : [];
  const ogImageUrl = stringValue(seo.ogImageUrl);
  return {
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(keywords.length ? { keywords } : {}),
    ...(canonicalPath.startsWith("/") ? { canonicalPath } : {}),
    ogImage: ogImageUrl ? { src: ogImageUrl, alt: stringValue(seo.ogImageAlt, cover.alt), isPlaceholder: false } : cover,
    noIndex: seo.noIndex === true,
  };
}

export function managedNewsArticle(item: CmsContent): Article | null {
  if (item.type !== "article" || item.data.visible === false) return null;
  const coverUrl = stringValue(item.coverUrl, stringValue(item.data.coverImageUrl));
  if (!coverUrl) return null;
  const cover = { src: coverUrl, alt: stringValue(item.data.coverAlt, `${item.title}消息封面`), isPlaceholder: false };
  const blocks = bodyBlocks(item.data.bodyBlocks);
  const body = blocks.flatMap((block) => {
    if (block.type === "heading") return [`${block.level === 2 ? "##" : "###"} ${block.text}`];
    if (block.type === "quote") return [`> ${block.text}`];
    if (block.type === "paragraph") return [block.text];
    return [];
  });
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    subtitle: stringValue(item.data.subtitle) || undefined,
    excerpt: stringValue(item.summary, item.title),
    categoryId: stringValue(item.data.categoryId, "activity-announcement"),
    category: stringValue(item.data.category, "活動公告"),
    cover,
    author: stringValue(item.data.author, "My Dream 編輯部"),
    publishedAt: stringValue(item.data.publishedAt, "2026-08-14"),
    body: body.length ? body : [stringValue(item.summary, item.title)],
    bodyBlocks: blocks.length ? blocks : undefined,
    featured: item.featured,
    publicationStatus: "published",
    seo: seoFields(item.data.seo, cover),
  };
}

export function managedNewsArticles(items: CmsContent[] | null, fallback: Article[]) {
  if (items === null) return fallback;
  return items.map(managedNewsArticle).filter((item): item is Article => item !== null);
}
