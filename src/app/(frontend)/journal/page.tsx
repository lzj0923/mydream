import { JournalBrowser } from "@/components/v2/journal/journal-browser";
import { V2PageHero } from "@/components/v2/page-hero/page-hero";
import { getArticleCategories, getArticles, getSiteSettings } from "@/content/queries";
import { buildSeoMetadata } from "@/content/seo";
import { v2Assets } from "@/data/v2-assets";
import { publishedArticles } from "@/features/v2/internal-model";

export async function generateMetadata() {
  return buildSeoMetadata(await getSiteSettings(), { title: "最新消息", description: "短劇推薦、創作者指南與 My Dream 平台消息。", path: "/journal" });
}

export default async function JournalPage() {
  const [articles, categories] = await Promise.all([getArticles(), getArticleCategories()]);
  const publicArticles = publishedArticles(articles);
  const categoryIds = new Set(publicArticles.map((article) => article.categoryId));
  const publicCategories = categories.filter((category) => category.contentStatus === "published" && categoryIds.has(category.id));

  return (
    <div className="v2-page v2-journal-page">
      <V2PageHero
        eyebrow="MY DREAM JOURNAL"
        variant="compact"
        title="最新消息"
        description="平台公告、創作者資訊、短劇趨勢、使用教學與品牌合作。"
        background={v2Assets.backgrounds.news}
        breadcrumbs={[{ label: "首頁", href: "/" }, { label: "最新消息" }]}
        primaryCta={{ label: "瀏覽文章", href: "#journal-library" }}
      />
      <section className="v2-page-section" id="journal-library">
        <div className="v2-page-shell"><JournalBrowser articles={publicArticles} categories={publicCategories} /></div>
      </section>
    </div>
  );
}
