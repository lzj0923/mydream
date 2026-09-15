import type { Metadata } from "next";

import { CreatorIdApplication } from "@/components/creator-id/creator-id-application";

export const metadata: Metadata = {
  title: "免費建立 AI Creator ID｜身分登錄申請",
  description: "免費提交 AI 虛擬人物身分登錄申請，建立 AI Creator ID 與平台內保護。",
  alternates: { canonical: "/creator-id/apply" },
};

export default function CreatorIdApplicationPage() {
  return <CreatorIdApplication />;
}
