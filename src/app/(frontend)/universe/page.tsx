import type { Metadata } from "next";

import { JygAiUniverseHub } from "@/components/prototype/jyg-ai-universe-hub";
import { getManagedContent, getManagedPage } from "@/content/cms/java-cms-client";

export const metadata: Metadata = {
  title: "AI創作中心｜學習・創造・啟發",
  description: "在 AI 創作中心觀看原創影片、探索提示詞資源並學習 AI 創作流程。",
};

export default async function UniversePage({ searchParams }: { searchParams: Promise<{ category?: string | string[] }> }) {
  const [managedOriginalVideos, managedTutorials, managedInspirations, managedPage] = await Promise.all([
    getManagedContent("original-video", "zh-Hant", 24),
    getManagedContent("tutorial", "zh-Hant", 24),
    getManagedContent("inspiration", "zh-Hant", 24),
    getManagedPage("/universe", "zh-Hant"),
  ]);
  const params = await searchParams;
  const category = Array.isArray(params.category) ? params.category[0] : params.category;
  return <JygAiUniverseHub initialCategory={category} managedOriginalVideos={managedOriginalVideos ?? []} managedTutorials={managedTutorials ?? []} managedInspirations={managedInspirations ?? []} managedPage={managedPage} />;
}
