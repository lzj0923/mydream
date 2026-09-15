import type { Metadata } from "next";

import { LegalDocumentPage } from "@/components/v2/legal/legal-document-page";
import { getLegalDocument } from "@/content/queries";

export const metadata: Metadata = {
  title: "隱私權政策",
  robots: { index: false, follow: true },
  alternates: { canonical: "/privacy" },
  openGraph: { url: "/privacy" },
};

export default async function PrivacyPage() {
  return <LegalDocumentPage kind="privacy" document={await getLegalDocument("privacy")} />;
}
