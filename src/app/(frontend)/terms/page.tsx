import type { Metadata } from "next";

import { LegalDocumentPage } from "@/components/v2/legal/legal-document-page";
import { getLegalDocument } from "@/content/queries";

export const metadata: Metadata = {
  title: "服務條款",
  robots: { index: false, follow: true },
  alternates: { canonical: "/terms" },
  openGraph: { url: "/terms" },
};

export default async function TermsPage() {
  return <LegalDocumentPage kind="terms" document={await getLegalDocument("terms")} />;
}
