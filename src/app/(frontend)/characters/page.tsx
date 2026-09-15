import type { Metadata } from "next";

import { JygCharacterCard, JygPageHero, JygPrototypeNotice, JygSectionHeading } from "@/components/prototype/jyg-prototype";
import { prototypeCharacters } from "@/data/jyg-prototype";

export const metadata: Metadata = { title: "角色宇宙", description: "探索 MY DREAM 原創 IP 中的角色、能力與故事關係。" };

export default function CharactersPage() {
  return (
    <div className="jyg-prototype">
      <JygPageHero eyebrow="CHARACTER UNIVERSE" title="角色，讓世界被記住" description="從人格、能力到關係與成長，每一個角色都是連接觀眾與原創宇宙的入口。" image="/cms-media/prototype/jyg/character-lineup.webp" imagePosition="center" metric="04 CORE CHARACTERS" />
      <div className="jyg-shell"><JygPrototypeNotice /></div>
      <section className="jyg-section jyg-section--tight jyg-section--characters">
        <div className="jyg-shell">
          <JygSectionHeading eyebrow="CHARACTER ARCHIVE" title="核心角色檔案" description="角色卡片將人物形象、所屬 IP 與核心定位放在同一層級呈現。" />
          <div className="jyg-character-grid">{prototypeCharacters.map((item) => <JygCharacterCard key={item.slug} item={item} />)}</div>
        </div>
      </section>
      <section className="jyg-section jyg-character-principles">
        <div className="jyg-shell">
          <JygSectionHeading eyebrow="CHARACTER SYSTEM" title="角色不是素材，是長期資產" description="一個成熟角色需要視覺、人格、關係與可持續故事共同成立。" />
          <div className="jyg-principle-grid"><div><small>01</small><strong>視覺識別</strong><p>輪廓、材質與色彩必須一眼可辨識。</p></div><div><small>02</small><strong>人格核心</strong><p>擁有穩定信念，也擁有會改變選擇的矛盾。</p></div><div><small>03</small><strong>關係網絡</strong><p>讓角色在夥伴、對手與世界之間持續產生故事。</p></div><div><small>04</small><strong>跨媒介生命</strong><p>能夠進入漫畫、動畫、互動與授權場景。</p></div></div>
        </div>
      </section>
    </div>
  );
}
