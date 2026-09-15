import { z } from "zod";

export const ContentStatusSchema = z.enum(["draft", "review", "published", "placeholder", "archived"]);
export const publicationStatusSchema = ContentStatusSchema;
export const storeAvailabilitySchema = z.enum(["available", "coming-soon", "temporarily-unavailable"]);
export const InternalHrefSchema = z.string().regex(/^\/(?!\/)(?!.*[\\\u0000-\u001f\u007f]).*$/, "請輸入安全站內網址");

export const MediaAssetSchema = z.object({ src: z.string().min(1), alt: z.string().min(1), width: z.number().int().positive().optional(), height: z.number().int().positive().optional(), poster: z.string().min(1).optional(), isPlaceholder: z.boolean().default(false) });
export const mediaSchema = MediaAssetSchema;
export const SeoSchema = z.object({
  title: z.string().min(1).max(70).optional(),
  description: z.string().min(1).max(180).optional(),
  keywords: z.array(z.string().min(1).max(50)).max(12).optional(),
  canonicalPath: z.string().startsWith("/").optional(),
  canonicalURL: z.string().url().refine((value) => /^https?:\/\//i.test(value)).optional(),
  ogImage: MediaAssetSchema.optional(),
  noIndex: z.boolean().default(false),
});
export const seoSchema = SeoSchema;

export const NavigationItemSchema = z.object({ id: z.string().min(1), label: z.string().min(1), href: InternalHrefSchema, order: z.number().int().nonnegative(), visibility: ContentStatusSchema.default("published"), comingSoon: z.boolean().default(false) });
export const HomeSectionSchema = z.object({
  eyebrow: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  subtitle: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  ctaLabel: z.string().min(1).optional(),
  ctaHref: InternalHrefSchema.optional(),
  secondaryCtaLabel: z.string().min(1).optional(),
  secondaryCtaHref: InternalHrefSchema.optional(),
  media: MediaAssetSchema.optional(),
  visibility: ContentStatusSchema.default("published"),
});
export const HomeTaskCardSchema = z.object({ icon: z.enum(["check-in", "watch", "invite"]), title: z.string().min(1), description: z.string().min(1), statusLabel: z.string().min(1), actionLabel: z.string().min(1) });
export const HomeFeatureItemSchema = z.object({ icon: z.enum(["library", "hd", "creator", "reward", "shield"]), title: z.string().min(1), description: z.string().min(1) });
export const HomePageSchema = z.object({
  id: z.literal("home"),
  hero: HomeSectionSchema,
  heroDevice: MediaAssetSchema.optional(),
  brandStatement: HomeSectionSchema,
  viewerCreator: HomeSectionSchema,
  dramaDiscovery: HomeSectionSchema,
  creatorCenter: HomeSectionSchema,
  creatorFeed: HomeSectionSchema,
  rewards: HomeSectionSchema,
  rewardCards: z.array(HomeTaskCardSchema).max(3).default([]),
  platformFeatures: z.array(HomeFeatureItemSchema).max(5).default([]),
  profile: HomeSectionSchema,
  latestContent: HomeSectionSchema,
  journal: HomeSectionSchema,
  downloadCTA: HomeSectionSchema,
  downloadDevice: MediaAssetSchema.optional(),
  footerCTA: HomeSectionSchema.optional(),
  featuredDramaIds: z.array(z.string()).default([]),
  featuredCreatorIds: z.array(z.string()).default([]),
  featuredArticleIds: z.array(z.string()).default([]),
  visibility: ContentStatusSchema.default("published"),
  seo: SeoSchema.optional(),
});

export const SiteSettingsSchema = z.object({
  id: z.literal("site"), name: z.string().min(1), locale: z.literal("zh-Hant"), siteUrl: z.string().url(), defaultSeo: SeoSchema,
  logo: MediaAssetSchema.optional(),
  socialLinks: z.record(z.string(), z.string().url()).default({}), contactEmail: z.string().email().optional(),
  company: z.object({ name: z.string().min(1).optional(), registration: z.string().optional(), email: z.string().email().optional(), phone: z.string().optional(), address: z.string().optional() }).optional(),
  supportEmail: z.string().email().optional(), businessEmail: z.string().email().optional(), appStoreUrl: z.string().url().optional(), googlePlayUrl: z.string().url().optional(), androidDownloadUrl: z.string().url().optional(), deepLink: z.string().url().optional(), qrCode: MediaAssetSchema.optional(), copyrightStartYear: z.number().int().min(2000).max(2100).optional(), availabilityStatus: storeAvailabilitySchema.optional(), googlePlayStatus: storeAvailabilitySchema.optional(), androidStatus: storeAvailabilitySchema.optional(), qrCodeStatus: storeAvailabilitySchema.optional(), deepLinkStatus: storeAvailabilitySchema.optional(),
  seo: SeoSchema.optional(),
});
export const siteSchema = SiteSettingsSchema;

const CategorySchema = z.object({ id: z.string().min(1), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), name: z.string().min(1), description: z.string().min(1), order: z.number().int().nonnegative(), contentStatus: ContentStatusSchema });
export const DramaCategorySchema = CategorySchema.extend({ kind: z.literal("drama") });
export const ArticleCategorySchema = CategorySchema.extend({ kind: z.literal("article") });

export const DramaSchema = z.object({ id: z.string().min(1), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), title: z.string().min(1), synopsis: z.string().min(1), categoryIds: z.array(z.string().min(1)).min(1), categories: z.array(z.string().min(1)).min(1), tags: z.array(z.string().min(1)).default([]), poster: MediaAssetSchema, trailer: MediaAssetSchema.optional(), episodes: z.number().int().positive().optional(), availability: z.enum(["upcoming", "available", "ended"]).default("upcoming"), appUrl: z.string().url().optional(), featured: z.boolean().default(false), ranking: z.number().int().positive().optional(), publicationStatus: ContentStatusSchema, seo: SeoSchema.optional() });
export const dramaSchema = DramaSchema;

export const CreatorSchema = z.object({ id: z.string().min(1), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), displayName: z.string().min(1), bio: z.string().min(1), avatar: MediaAssetSchema.optional(), featuredWork: MediaAssetSchema.optional(), featured: z.boolean().default(false), publicationStatus: ContentStatusSchema, seo: SeoSchema.optional() });
export const creatorSchema = CreatorSchema;

export const ArticleBodyBlockSchema = z.discriminatedUnion("type", [
  z.object({ id: z.string().min(1), type: z.literal("heading"), level: z.union([z.literal(2), z.literal(3)]), text: z.string().min(1) }),
  z.object({ id: z.string().min(1), type: z.literal("paragraph"), text: z.string().min(1) }),
  z.object({ id: z.string().min(1), type: z.literal("quote"), text: z.string().min(1) }),
  z.object({ id: z.string().min(1), type: z.literal("image"), media: MediaAssetSchema, caption: z.string().optional() }),
]);
export const ArticleSchema = z.object({ id: z.string().min(1), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), title: z.string().min(1), subtitle: z.string().min(1).optional(), excerpt: z.string().min(1), categoryId: z.string().min(1), category: z.string().min(1), cover: MediaAssetSchema, author: z.string().min(1), publishedAt: z.string().date(), body: z.array(z.string().min(1)).min(1), bodyBlocks: z.array(ArticleBodyBlockSchema).optional(), featured: z.boolean().default(false), publicationStatus: ContentStatusSchema, seo: SeoSchema.optional() });
export const articleSchema = ArticleSchema;

export const LegalPageSchema = z.object({ id: z.string().min(1), slug: z.enum(["privacy", "terms"]), title: z.string().min(1), version: z.string().min(1), effectiveAt: z.string().date().optional(), body: z.array(z.string().min(1)).min(1), publicationStatus: ContentStatusSchema, seo: SeoSchema.optional() });
export const legalDocumentSchema = LegalPageSchema;
export const BusinessPageSchema = z.object({ id: z.literal("business"), title: z.string().min(1), description: z.string().min(1), contactEmail: z.string().email().optional(), visibility: ContentStatusSchema, seo: SeoSchema.optional() });
export const DownloadSettingsSchema = z.object({ id: z.literal("download-settings"), ios: z.object({ availability: storeAvailabilitySchema, url: z.string().url().optional() }), googlePlay: z.object({ availability: storeAvailabilitySchema, url: z.string().url().optional() }), android: z.object({ availability: storeAvailabilitySchema, url: z.string().url().optional() }), qrCode: MediaAssetSchema.optional(), qrCodeStatus: storeAvailabilitySchema.default("coming-soon"), deepLinkBase: z.string().url().optional(), deepLinkStatus: storeAvailabilitySchema.default("coming-soon"), seo: SeoSchema.optional() });
export const downloadSettingsSchema = DownloadSettingsSchema;

export type ContentStatus = z.infer<typeof ContentStatusSchema>;
export type MediaAsset = z.infer<typeof MediaAssetSchema>;
export type SeoFields = z.infer<typeof SeoSchema>;
export type NavigationItem = z.infer<typeof NavigationItemSchema>;
export type HomePage = z.infer<typeof HomePageSchema>;
export type Site = z.infer<typeof SiteSettingsSchema>;
export type DramaCategory = z.infer<typeof DramaCategorySchema>;
export type ArticleCategory = z.infer<typeof ArticleCategorySchema>;
export type Drama = z.infer<typeof DramaSchema>;
export type Creator = z.infer<typeof CreatorSchema>;
export type Article = z.infer<typeof ArticleSchema>;
export type ArticleBodyBlock = z.infer<typeof ArticleBodyBlockSchema>;
export type LegalDocument = z.infer<typeof LegalPageSchema>;
export type BusinessPage = z.infer<typeof BusinessPageSchema>;
export type DownloadSettings = z.infer<typeof DownloadSettingsSchema>;
