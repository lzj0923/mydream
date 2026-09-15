import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  ChevronLeft,
  Clapperboard,
  FolderOpen,
  ImageIcon,
  MessageSquareText,
  PanelsTopLeft,
  UserRound,
  Video,
} from "lucide-react";

export const metadata: Metadata = {
  title: "AI提示詞庫｜AI宇宙",
  description: "探索角色設計、場景生成、影片製作與 AI 創作相關 Prompt 資源。",
};

const promptLibraryUrl = "https://drive.google.com/drive/folders/1Kw1EQ_wq3UE7bmwJesK_8QyMWHI1G9-X?usp=sharing";

const promptCategories = [
  { icon: UserRound, index: "01", title: "角色設計 Prompt", description: "建立角色外觀、性格、服裝與世界觀設定。" },
  { icon: Video, index: "02", title: "影片生成 Prompt", description: "整理鏡頭運動、動作節奏與影片生成描述。" },
  { icon: ImageIcon, index: "03", title: "圖片生成 Prompt", description: "掌握構圖、光影、風格與畫面細節的生成方式。" },
  { icon: PanelsTopLeft, index: "04", title: "場景設定 Prompt", description: "快速建立符合故事氛圍的空間、時代與環境。" },
  { icon: Clapperboard, index: "05", title: "分鏡創作 Prompt", description: "從故事節點延伸鏡位、景別與連續分鏡規劃。" },
] as const;

export default function PromptLibraryPage() {
  return (
    <div className="jyg-prototype jyg-prompt-library-page">
      <section className="jyg-prompt-library-hero" aria-labelledby="prompt-library-title">
        <span className="jyg-prompt-library-hero__stars" aria-hidden />
        <div className="jyg-shell jyg-prompt-library-hero__grid">
          <div className="jyg-prompt-library-hero__copy">
            <Link href="/universe" className="jyg-prompt-library-back"><ChevronLeft aria-hidden />返回 AI 宇宙</Link>
            <h1 id="prompt-library-title">AI提示詞庫</h1>
            <h2>探索整理好的 AI 創作提示詞資源</h2>
            <p>提供角色設計、場景生成、<br />影片製作與 AI 創作相關 Prompt，<br />協助創作者快速開始 AI 創作。</p>
          </div>

          <div className="jyg-prompt-library-orbit" aria-hidden>
            <i /><i /><i />
            <span><MessageSquareText /></span>
          </div>
        </div>
      </section>

      <main className="jyg-prompt-library-main">
        <section className="jyg-shell jyg-prompt-library-categories" aria-labelledby="prompt-category-title">
          <header>
            <h2 id="prompt-category-title">從想法開始，建立你的 AI 創作流程</h2>
            <p>依照不同創作階段選擇提示詞類型，快速找到適合的資源方向。</p>
          </header>

          <div className="jyg-prompt-library-grid">
            {promptCategories.map(({ icon: Icon, index, title, description }) => (
              <article key={title}>
                <small>{index}</small>
                <span><Icon aria-hidden /></span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="jyg-shell jyg-prompt-library-cta" aria-labelledby="prompt-cta-title">
          <span><FolderOpen aria-hidden /></span>
          <div>
            <h2 id="prompt-cta-title">準備好開始你的 AI 創作了嗎？</h2>
            <p>前往完整資料夾，查看所有已整理的創作提示詞資源。</p>
          </div>
          <a href={promptLibraryUrl} target="_blank" rel="noopener noreferrer">
            查看完整提示詞庫 <ArrowUpRight aria-hidden />
          </a>
        </section>
      </main>
    </div>
  );
}
