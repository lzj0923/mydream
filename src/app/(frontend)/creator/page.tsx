import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bot, Boxes, Clapperboard, Film, ScanFace, Sparkles } from "lucide-react";

import {
  JygPageHero,
  JygSectionHeading,
} from "@/components/prototype/jyg-prototype";
import { creatorSteps } from "@/data/jyg-prototype";

export const metadata: Metadata = {
  title: "AI Creator Platform",
  description: "把創意發展為角色、故事與跨媒介 AI 原創 IP。",
};

const capabilities = [
  { icon: Sparkles, title: "靈感發展", english: "IDEATION", text: "把一句概念擴展為清晰的世界觀、衝突與敘事方向。" },
  { icon: ScanFace, title: "角色設計", english: "CHARACTER", text: "建立角色外觀、人格、能力與長期成長路徑。" },
  { icon: Boxes, title: "世界建構", english: "WORLD BUILDING", text: "讓角色、地點、勢力與事件形成可持續發展的 IP 體系。" },
  { icon: Clapperboard, title: "漫劇製作", english: "COMIC DRAMA", text: "把漫畫語言轉換為適合移動觀看的動態敘事體驗。" },
  { icon: Film, title: "動畫升級", english: "ANIMATION", text: "從視覺開發到鏡頭設計，逐步邁向電影級角色表達。" },
  { icon: Bot, title: "AI 協作", english: "AI WORKFLOW", text: "讓創作者掌握方向，AI 負責加速反覆迭代與內容生產。" },
] as const;

export default function CreatorPage() {
  return (
    <div className="jyg-prototype">
      <JygPageHero
        eyebrow="AI CREATOR PLATFORM"
        title="讓一個靈感，長成原創宇宙"
        description="從概念、角色與世界觀開始，藉助 AI 協作流程，把創意發展成漫畫、漫劇、動畫與可長期經營的 IP。"
        image="/cms-media/prototype/jyg/character-lineup.webp"
        imagePosition="64% center"
        metric="IDEA → IP → ENTERTAINMENT"
      />
      <div className="jyg-shell" style={{ paddingTop: 24 }}><Link className="jyg-button jyg-button--gold" href="/creator/workspace">進入創作者工作台 <ArrowRight size={17} aria-hidden /></Link></div>

      <section className="jyg-section jyg-section--tight">
        <div className="jyg-shell">
          <JygSectionHeading
            eyebrow="CREATION PIPELINE"
            title="創作不是一次生成，而是一條完整路徑"
            description="每一步都保留人的判斷與審美，讓 AI 成為創作者的擴展能力。"
          />
          <div className="jyg-creator-flow jyg-creator-flow--page">
            {creatorSteps.map((item) => (
              <div key={item.step}>
                <small>{item.step}</small>
                <b>{item.title}</b>
                <span>{item.description}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="jyg-section jyg-section--matrix">
        <div className="jyg-shell">
          <JygSectionHeading
            eyebrow="CREATOR CAPABILITIES"
            title="把技術複雜度，轉換成創作自由"
            description="通過創作者工作台管理劇本、完善創作資料，跟進每一次原創投稿。"
          />
          <div className="jyg-creator-capabilities">
            {capabilities.map(({ icon: Icon, title, english, text }) => (
              <article key={title}>
                <Icon aria-hidden />
                <small>{english}</small>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="jyg-section jyg-creator-callout" id="join">
        <div className="jyg-shell">
          <h2>未來的代表性 IP，可能從你的一個想法開始</h2>
          <p>用一份劇本開啟創作，在工作台保存靈感、提交作品並跟進審核。</p>
          <Link className="jyg-button jyg-button--gold" href="/creator/workspace">進入創作者中心 <ArrowRight size={17} aria-hidden /></Link>
        </div>
      </section>
    </div>
  );
}
