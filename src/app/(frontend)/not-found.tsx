import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";

export default function NotFound() {
  return (
    <section className="v2-system-state v2-system-state--404">
      <div className="v2-system-state__code" aria-hidden>404</div>
      <div className="v2-system-state__copy">
        <h1>這一頁，還沒寫進故事裡。</h1>
        <p>連結可能已經移動、內容尚未發布，或這個故事從未存在。你可以回到首頁，或繼續探索短劇。</p>
        <div className="v2-page-actions"><Link className="v2-cta v2-cta--primary" href="/"><ArrowLeft size={17} aria-hidden />回到首頁</Link><Link className="v2-cta v2-cta--line" href="/explore"><Search size={17} aria-hidden />探索短劇</Link></div>
      </div>
    </section>
  );
}
