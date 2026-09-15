"use client";

import Image from "next/image";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

import type { Drama, DramaCategory } from "@/content/types";
import { V2DramaCard } from "@/components/v2/drama/drama-card";
import { V2StatusPanel } from "@/components/v2/shared/status-panel";
import { v2Assets } from "@/data/v2-assets";

const previewTitles = ["夜色與你", "大宋懸王", "逆襲之星途璀璨", "別和小叔談戀愛", "我以三針助你成皇", "重生後我成了豪門"];

export function ExploreBrowser({ dramas, categories }: { dramas: Drama[]; categories: DramaCategory[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const isFiltering = query !== deferredQuery;

  const results = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLocaleLowerCase("zh-Hant");
    return dramas.filter((drama) => {
      const inCategory = category === "all" || drama.categoryIds.includes(category);
      const inMode = !featuredOnly || drama.featured;
      const haystack = `${drama.title} ${drama.synopsis} ${drama.categories.join(" ")} ${drama.tags.join(" ")}`.toLocaleLowerCase("zh-Hant");
      return inCategory && inMode && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }, [category, deferredQuery, dramas, featuredOnly]);

  const filtered = Boolean(query || category !== "all" || featuredOnly);
  const clear = () => { setQuery(""); setCategory("all"); setFeaturedOnly(false); };

  return (
    <div className="v2-explore-browser">
      <div className="v2-explore-tools" data-motion="reveal">
        <label className="v2-search-field">
          <Search size={19} aria-hidden />
          <span className="sr-only">搜尋短劇</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋片名、分類或標籤" type="search" />
          {query && <button type="button" onClick={() => setQuery("")} aria-label="清除搜尋"><X size={17} aria-hidden /></button>}
        </label>
        <button className={`v2-feature-filter${featuredOnly ? " is-active" : ""}`} type="button" aria-pressed={featuredOnly} onClick={() => setFeaturedOnly((value) => !value)}>
          <SlidersHorizontal size={16} aria-hidden />精選內容
        </button>
      </div>

      <div className="v2-category-rail" aria-label="短劇分類" data-motion="reveal">
        <button type="button" className={category === "all" ? "is-active" : ""} aria-pressed={category === "all"} onClick={() => setCategory("all")}>全部</button>
        {categories.map((item) => <button type="button" key={item.id} className={category === item.id ? "is-active" : ""} aria-pressed={category === item.id} onClick={() => setCategory(item.id)}>{item.name}</button>)}
      </div>

      <div className="v2-result-bar" aria-live="polite">
        <span>{isFiltering ? "正在整理片單…" : `${results.length} 部已發布短劇`}</span>
        {filtered && <button type="button" onClick={clear}>清除篩選<X size={14} aria-hidden /></button>}
      </div>

      {isFiltering ? (
        <div className="v2-skeleton-grid" aria-label="短劇載入中">{Array.from({ length: 4 }, (_, index) => <span key={index} />)}</div>
      ) : results.length > 0 ? (
        <div className="v2-library-grid" data-motion="cascade">{results.map((drama, index) => <V2DramaCard key={drama.id} drama={drama} priority={index < 4} />)}</div>
      ) : dramas.length === 0 && !filtered ? (
        <div className="v2-preview-library" aria-label="短劇片庫介面視覺示意">
          <p><strong>片庫介面預覽</strong><span>以下海報為視覺示意，正式片單將由 CMS 已發布內容取代。</span></p>
          <div className="v2-library-grid" data-motion="cascade">
            {v2Assets.dramas.map((image, index) => <article className="v2-library-card is-preview" key={image.src}><div className="v2-library-card__image"><Image src={image.src} alt={image.alt} fill sizes="(max-width: 600px) 50vw, 16vw" priority={index < 4} /><span className="v2-library-card__badge">視覺示意</span></div><div className="v2-library-card__copy"><small>短劇預覽</small><h3>{previewTitles[index]}</h3><div className="v2-library-card__meta"><span>正式片單準備中</span></div></div></article>)}
          </div>
        </div>
      ) : (
        <V2StatusPanel
          eyebrow="NO PUBLISHED RESULT"
          title={filtered ? "沒有符合條件的已發布短劇。" : "正式片單正在準備中。"}
          description={filtered ? "調整關鍵字或分類，再找一次想看的故事。" : "這裡只顯示 CMS 中已發布且使用正式素材的內容；草稿與視覺示意不會混入結果。"}
          action={filtered ? undefined : { label: "瞭解 My Dream", href: "/about" }}
        />
      )}
    </div>
  );
}
