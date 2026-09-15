import type { Article, ArticleCategory, BusinessPage, Creator, DownloadSettings, Drama, DramaCategory, HomePage, LegalDocument, NavigationItem, Site } from "@/content/types";

export type ListOptions = { limit?: number; category?: string; query?: string; ids?: string[] };

/** Vendor-neutral domain API. UI never filters featured content or categories itself. */
export interface ContentRepository {
  getSite(): Promise<Site>; getSiteSettings(): Promise<Site>; getNavigation(): Promise<NavigationItem[]>; getHomePage(): Promise<HomePage>;
  listDramas(options?: ListOptions): Promise<Drama[]>; getDramas(options?: ListOptions): Promise<Drama[]>; getFeaturedDramas(): Promise<Drama[]>; getDramaBySlug(slug: string): Promise<Drama | null>; getDramaCategories(): Promise<DramaCategory[]>;
  listCreators(options?: ListOptions): Promise<Creator[]>; getCreators(options?: ListOptions): Promise<Creator[]>; getFeaturedCreators(): Promise<Creator[]>; getCreatorBySlug(slug: string): Promise<Creator | null>;
  listArticles(options?: ListOptions): Promise<Article[]>; getArticles(options?: ListOptions): Promise<Article[]>; getFeaturedArticles(): Promise<Article[]>; getArticleBySlug(slug: string): Promise<Article | null>; getArticleCategories(): Promise<ArticleCategory[]>;
  getLegalDocument(slug: LegalDocument["slug"]): Promise<LegalDocument | null>; getLegalPage(type: LegalDocument["slug"]): Promise<LegalDocument | null>; getBusinessPage(): Promise<BusinessPage>; getDownloadSettings(): Promise<DownloadSettings>;
}
