import { ExploreBrowser } from "@/components/v2/drama/explore-browser";
import { V2PageHero } from "@/components/v2/page-hero/page-hero";
import { getDramaCategories, getDramas, getSiteSettings } from "@/content/queries";
import { buildSeoMetadata } from "@/content/seo";
import { v2Assets } from "@/data/v2-assets";
import { publishedDramas } from "@/features/v2/internal-model";

export async function generateMetadata() {
  return buildSeoMetadata(await getSiteSettings(), { title: "探索短劇", description: "搜尋已發布短劇，依題材與精選狀態找到下一部想看的故事。", path: "/explore" });
}

export default async function ExplorePage() {
  const [dramas, categories] = await Promise.all([getDramas(), getDramaCategories()]);
  const publicDramas = publishedDramas(dramas);
  const publicCategoryIds = new Set(publicDramas.flatMap((drama) => drama.categoryIds));
  const publicCategories = categories.filter((category) => category.contentStatus === "published" && publicCategoryIds.has(category.id));

  return (
    <div className="v2-page v2-explore-page">
      <V2PageHero
        eyebrow="EXPLORE THE STORIES"
        variant="compact"
        title="今晚，想追哪一部？"
        description="從已發布片庫快速搜尋、分類與篩選，直接找到下一段故事。"
        background={v2Assets.backgrounds.hero}
        breadcrumbs={[{ label: "首頁", href: "/" }, { label: "探索短劇" }]}
        primaryCta={{ label: "查看片單", href: "#drama-library" }}
      />
      <section className="v2-page-section" id="drama-library">
        <div className="v2-page-shell">
          <header className="v2-library-intro" data-motion="reveal"><div><h2>短劇片庫</h2></div><p>僅顯示 CMS 已發布內容；集數與狀態以正式資料為準。</p></header>
          <ExploreBrowser dramas={publicDramas} categories={publicCategories} />
        </div>
      </section>
    </div>
  );
}
