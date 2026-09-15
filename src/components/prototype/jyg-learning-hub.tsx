"use client";

import { ArrowRight, Search } from "lucide-react";
import { useState } from "react";

export function JygLearningHub() {
  const [query, setQuery] = useState("");

  return (
    <div className="jyg-prototype jyg-learning-page">
      <section className="jyg-learning-hero">
        <div className="jyg-learning-hero__stars" aria-hidden />
        <div className="jyg-shell jyg-learning-hero__grid">
          <div className="jyg-learning-hero__copy">
            <h1>探索 AI 的<br />無限宇宙</h1>
            <p>觀看 AI 原創作品，學習 AI 提示詞與創作技巧，開啟你的 AI 創作旅程。</p>
            <form className="jyg-learning-search" onSubmit={(event) => event.preventDefault()}>
              <Search aria-hidden />
              <label>
                <span className="sr-only">搜尋 AI 內容</span>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋 AI影片、提示詞或教學..." />
              </label>
              <button type="submit" aria-label="搜尋"><ArrowRight aria-hidden /></button>
            </form>
            <div className="jyg-learning-trends">
              <span>熱門搜尋：</span>
              {['Midjourney', 'ChatGPT 提示詞', 'AI 動畫製作'].map((item) => (
                <button type="button" key={item} onClick={() => setQuery(item)}>{item}</button>
              ))}
            </div>
          </div>

          <div className="jyg-learning-orb" aria-hidden>
            <i /><i /><i />
            <strong>AI</strong>
          </div>
        </div>
      </section>
    </div>
  );
}
