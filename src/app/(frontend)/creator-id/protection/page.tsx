import { getManagedPage } from "@/content/cms/java-cms-client";
import type { Metadata } from "next";

import { ProfessionalRightsPage } from "@/components/creator-id/professional-rights-page";

export const metadata: Metadata = {
  title: "專業權益保護方案｜台灣",
  description: "AI Creator 與 AI IP 的創作證據整理、台灣商標申請協助、授權文件與專業權益支援。",
  alternates: { canonical: "/creator-id/protection" },
};

export default async function CreatorIdProtectionPage() {
  const managedPage = await getManagedPage("/creator-id/protection", "zh-Hant");
  return (
    <ProfessionalRightsPage
      managedPage={managedPage}
      governmentFeeNotice="政府規費依經濟部智慧財產局最新公告及實際申請類別計算。"
      serviceFeeNotice="平台服務費將於資料預審完成後另行說明，不會在送出表單時直接收費。"
    />
  );
}
