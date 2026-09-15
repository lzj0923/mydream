import type { Metadata } from "next";

import { JygIpCard, JygPageHero, JygPrototypeNotice, JygSectionHeading } from "@/components/prototype/jyg-prototype";
import { prototypeIps } from "@/data/jyg-prototype";

export const metadata: Metadata = { title: "原創 IP", description: "MY DREAM 原創 AI IP 世界列表。" };

export default function IpsPage() {
  return (
    <div className="jyg-prototype">
      <JygPageHero eyebrow="ORIGINAL IP" title="每一個世界，都有自己的引力" description="探索世界觀、角色關係與作品計劃，找到下一個值得長期投入的原創宇宙。" image="/cms-media/prototype/jyg/ip-worlds.webp" metric="04 ORIGINAL WORLDS" />
      <div className="jyg-shell"><JygPrototypeNotice /></div>
      <section className="jyg-section jyg-section--tight">
        <div className="jyg-shell">
          <JygSectionHeading eyebrow="IP LIBRARY" title="原創世界資料庫" description="Prototype 階段以 mock data 驗證內容密度、卡片結構與瀏覽路徑。" />
          <div className="jyg-ip-grid">{prototypeIps.map((item) => <JygIpCard key={item.slug} item={item} />)}</div>
        </div>
      </section>
    </div>
  );
}
