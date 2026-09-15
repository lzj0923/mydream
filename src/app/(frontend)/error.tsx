"use client";

import Link from "next/link";
import { Home, RotateCcw } from "lucide-react";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="v2-system-state v2-system-state--error">
      <div className="v2-system-state__code" aria-hidden>ERR</div>
      <div className="v2-system-state__copy">
        <h1>暫時無法載入這一頁。</h1>
        <p>沒有顯示技術細節或個人資料。你可以安全重試，或回到首頁繼續瀏覽。</p>
        <div className="v2-page-actions"><button className="v2-cta v2-cta--primary" type="button" onClick={reset}><RotateCcw size={17} aria-hidden />再試一次</button><Link className="v2-cta v2-cta--line" href="/"><Home size={17} aria-hidden />回到首頁</Link></div>
      </div>
    </section>
  );
}
