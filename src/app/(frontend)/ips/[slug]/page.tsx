import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";

import { JygCharacterCard, JygPageHero, JygPrototypeNotice, JygSectionHeading, JygWorkCard } from "@/components/prototype/jyg-prototype";
import { findPrototypeIp, prototypeCharacters, prototypeIps, prototypeWorks } from "@/data/jyg-prototype";

export function generateStaticParams() { return prototypeIps.map((item) => ({ slug: item.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const item = findPrototypeIp((await params).slug);
  return item ? { title: item.name, description: item.description } : {};
}

export default async function IpDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const item = findPrototypeIp((await params).slug);
  if (!item) notFound();
  const characters = prototypeCharacters.filter((character) => character.ipSlug === item.slug);
  const works = prototypeWorks.filter((work) => work.ipSlug === item.slug);

  return (
    <div className="jyg-prototype">
      <JygPageHero eyebrow={`${item.category} · ORIGINAL IP`} title={item.name} description={item.description} image={item.image.src} imagePosition={item.image.position} metric={`${item.stats.characters} CHARACTERS · ${item.stats.works} WORKS`} />
      <div className="jyg-shell"><JygPrototypeNotice /></div>
      <section className="jyg-section jyg-section--tight">
        <div className="jyg-shell jyg-world-intro">
          <div><h2>世界觀</h2></div>
          <div><p>{item.worldSetting}</p><dl><div><dt>開發階段</dt><dd>{item.stats.stage}</dd></div><div><dt>角色規模</dt><dd>{item.stats.characters}</dd></div><div><dt>作品計劃</dt><dd>{item.stats.works}</dd></div></dl></div>
        </div>
      </section>
      <section className="jyg-section jyg-section--characters">
        <div className="jyg-shell">
          <JygSectionHeading eyebrow="CHARACTERS" title="世界裡的角色" description={characters.length ? "角色是觀眾進入世界觀的情感入口。" : "角色資料正在概念孵化階段。"} action={{ label: "全部角色", href: "/characters" }} />
          {characters.length ? <div className="jyg-character-rail">{characters.map((character) => <JygCharacterCard key={character.slug} item={character} />)}</div> : <div className="jyg-empty-state"><strong>角色孵化中</strong><p>此 IP 的角色關係將在下一階段進入正式內容建模。</p></div>}
        </div>
      </section>
      <section className="jyg-section">
        <div className="jyg-shell">
          <JygSectionHeading eyebrow="CONNECTED WORKS" title="關聯作品" description="同一個世界，通過不同媒介展開新的觀看方式。" action={{ label: "全部作品", href: "/works" }} />
          {works.length ? <div className="jyg-work-grid">{works.map((work) => <JygWorkCard key={work.slug} item={work} />)}</div> : <div className="jyg-empty-state"><strong>作品開發中</strong><p>此世界尚未進入公開作品階段。</p></div>}
        </div>
      </section>
      <section className="jyg-section jyg-timeline-section">
        <div className="jyg-shell">
          <JygSectionHeading eyebrow="WORLD TIMELINE" title="宇宙時間線" description="從神話源點到跨媒介開發，建立可持續擴張的內容節奏。" />
          <div className="jyg-timeline"><div><strong>世界觀起點</strong><p>核心命題與規則被定義。</p></div><div><strong>角色進入</strong><p>關係與衝突形成故事動力。</p></div><div><strong>作品展開</strong><p>漫畫、漫劇與動畫連接觀眾。</p></div><div><strong>跨界延伸</strong><p>授權、發行與互動持續擴大價值。</p></div></div>
          <Link className="jyg-button jyg-button--gold" href="/business">探索 IP 合作 <ArrowRight size={17} aria-hidden /></Link>
        </div>
      </section>
    </div>
  );
}
