import { JygAllWorksPage } from "@/components/prototype/jyg-works-index";
import { getManagedContent, getManagedPage } from "@/content/cms/java-cms-client";
import { getDramas, getSiteSettings } from "@/content/queries";
import { buildSeoMetadata } from "@/content/seo";
import { buildJygAllWorksModel } from "@/features/jyg/home-featured-works-model";

export async function generateMetadata() {
  return buildSeoMetadata(await getSiteSettings(), {
    title: "全部作品",
    description: "瀏覽 MY DREAM 已公開的 AI 短劇、漫劇、動畫與原創 IP 作品。",
    path: "/works",
  });
}

export default async function WorksPage() {
  const [managedWorks, dramas, page] = await Promise.all([
    getManagedContent("work", "zh-Hant", 100),
    getDramas({ limit: 100 }),
    getManagedPage("/works", "zh-Hant"),
  ]);
  const works = buildJygAllWorksModel({ managedWorks, dramas }).items;
  return <JygAllWorksPage works={works} page={page} />;
}
