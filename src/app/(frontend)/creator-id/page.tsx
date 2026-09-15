import type { Metadata } from "next";

import { CreatorIdLanding } from "@/components/creator-id/creator-id-landing";

export const metadata: Metadata = {
  title: "AI KOL 認證與權益保護｜AI Creator ID",
  description: "免費建立 AI Creator ID，完成 AI 虛擬人物身分登錄、平台認證與公開查驗，並可洽詢專業權益保護方案。",
  alternates: { canonical: "/creator-id" },
};

export default function CreatorIdPage() {
  return <CreatorIdLanding />;
}
