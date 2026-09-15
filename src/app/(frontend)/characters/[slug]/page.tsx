import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Fingerprint, Orbit, Shield } from "lucide-react";
import { notFound } from "next/navigation";

import { JygPrototypeNotice, JygSectionHeading, JygWorkCard, PrototypeBrandMark, PrototypeFlag } from "@/components/prototype/jyg-prototype";
import { findPrototypeCharacter, prototypeCharacters, prototypeWorks } from "@/data/jyg-prototype";

export function generateStaticParams() { return prototypeCharacters.map((item) => ({ slug: item.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const item = findPrototypeCharacter((await params).slug);
  return item ? { title: item.name, description: item.profile } : {};
}

export default async function CharacterDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const item = findPrototypeCharacter((await params).slug);
  if (!item) notFound();
  const works = prototypeWorks.filter((work) => work.ipSlug === item.ipSlug).slice(0, 3);

  return (
    <div className="jyg-prototype">
      <section className={`jyg-character-detail-hero jyg-accent-${item.accent}`}>
        <div className="jyg-character-detail-hero__ambient" />
        <div className="jyg-shell jyg-character-detail-hero__grid">
          <div className="jyg-character-detail-hero__visual"><Image src={item.image.src} alt={item.image.alt} fill priority loading="eager" sizes="(max-width: 700px) 90vw, 50vw" style={{ objectPosition: item.image.position }} unoptimized /></div>
          <div className="jyg-character-detail-hero__copy">
            <PrototypeBrandMark />
            <PrototypeFlag />
            <span className="jyg-eyebrow">{item.ipName} · CHARACTER FILE</span>
            <h1>{item.name}</h1>
            <strong>{item.title}</strong>
            <p>{item.profile}</p>
            <div className="jyg-character-tags"><span><Fingerprint aria-hidden />身份已建立</span><span><Orbit aria-hidden />所屬 {item.ipName}</span><span><Shield aria-hidden />核心能力原型</span></div>
            <Link href={`/ips/${item.ipSlug}`} className="jyg-button jyg-button--gold">進入所屬 IP <ArrowRight size={17} aria-hidden /></Link>
          </div>
        </div>
      </section>
      <div className="jyg-shell"><JygPrototypeNotice /></div>
      <section className="jyg-section jyg-section--tight">
        <div className="jyg-shell jyg-character-profile-grid">
          <div><h2>角色背景</h2><p>{item.profile} 他所面對的每次選擇，都會改變西遊台灣的世界線。</p></div>
          <div><h2>能力系統</h2><p>{item.ability}</p><div className="jyg-ability-meter"><span style={{ width: "86%" }} /><small>世界適應度 86%</small></div><div className="jyg-ability-meter"><span style={{ width: "72%" }} /><small>敘事延展性 72%</small></div></div>
        </div>
      </section>
      <section className="jyg-section jyg-section--characters">
        <div className="jyg-shell">
          <JygSectionHeading eyebrow="CONNECTED WORKS" title="角色關聯作品" description="同一個角色在不同媒介中，持續累積新的故事層次。" />
          <div className="jyg-work-grid">{works.map((work) => <JygWorkCard key={work.slug} item={work} />)}</div>
        </div>
      </section>
    </div>
  );
}
