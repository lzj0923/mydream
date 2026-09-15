import Link from "next/link";
import { ArrowLeft, FileCheck2 } from "lucide-react";

import type { LegalDocument } from "@/content/types";
import { contentFallbacks } from "@/content/fallbacks";
import { v2Assets } from "@/data/v2-assets";
import { V2PageHero } from "@/components/v2/page-hero/page-hero";

export function LegalDocumentPage({ kind, document }: { kind: "privacy" | "terms"; document: LegalDocument | null }) {
  const title = document?.title ?? (kind === "privacy" ? "隱私權政策" : "服務條款");
  const effective = document?.effectiveAt ?? "待法務核定";
  const published = document?.publicationStatus === "published";

  return (
    <div className="v2-page v2-legal-page">
      <V2PageHero
        variant="compact"
        eyebrow={kind === "privacy" ? "PRIVACY" : "TERMS"}
        title={title}
        description="以清楚、可閱讀的方式呈現正式法律內容；文字本身保持 CMS／法務來源，不在視覺重構中改寫。"
        background={v2Assets.backgrounds.footer}
        breadcrumbs={[{ label: "首頁", href: "/" }, { label: title }]}
      />
      <section className="v2-page-section v2-legal-shell">
        <aside className="v2-legal-index" aria-label="文件目錄" data-motion="reveal">
          <FileCheck2 aria-hidden />
          <a href="#document-status">文件狀態</a>
          <a href="#document-content">正式內容</a>
          <Link href="/"><ArrowLeft size={15} aria-hidden />返回首頁</Link>
        </aside>
        <article className="v2-legal-document" data-motion="reveal">
          <header id="document-status">
            <span className={`v2-publication-badge${published ? " is-published" : ""}`}>{published ? "PUBLISHED" : "NOT PUBLISHED"}</span>
            <dl>
              <div><dt>版本</dt><dd>{document?.version ?? "待核定"}</dd></div>
              <div><dt>生效／更新時間</dt><dd>{effective}</dd></div>
            </dl>
            {!published && <p className="v2-draft-notice">此文件尚未以 Published 狀態發布，現階段內容不應視為正式法律文本。</p>}
          </header>
          <section id="document-content">
            <h2>正式內容</h2>
            {document?.body.length ? document.body.map((paragraph, index) => <p key={index}>{paragraph}</p>) : <p>{contentFallbacks.legal}</p>}
          </section>
        </article>
      </section>
    </div>
  );
}
