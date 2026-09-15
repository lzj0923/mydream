"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Search, X } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

import type { Article, ArticleCategory } from "@/content/types";
import { V2ArticleCard } from "@/components/v2/journal/article-card";
import { V2StatusPanel } from "@/components/v2/shared/status-panel";
import { v2Assets } from "@/data/v2-assets";

const PAGE_SIZE = 6;
const previewArticles = ["My Dream 全新版本正式上線", "創作者扶持計畫正式啟動", "熱門短劇專題：本週必看片單", "My Dream 品牌合作與內容公告"];

export function JournalBrowser({ articles, categories, basePath = "/journal" }: { articles: Article[]; categories: ArticleCategory[]; basePath?: "/journal" | "/news" }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const deferredQuery = useDeferredValue(query);
  const isFiltering = query !== deferredQuery;

  const filtered = useMemo(() => {
    const needle = deferredQuery.trim().toLocaleLowerCase("zh-Hant");
    return articles.filter((article) => {
      const matchesCategory = category === "all" || article.categoryId === category;
      const haystack = `${article.title} ${article.excerpt} ${article.category} ${article.author}`.toLocaleLowerCase("zh-Hant");
      return matchesCategory && (!needle || haystack.includes(needle));
    });
  }, [articles, category, deferredQuery]);

  const clear = () => { setQuery(""); setCategory("all"); setVisible(PAGE_SIZE); };
  const popular = articles.slice(0, 4);

  return (
    <div className="v2-journal-layout">
      <main className="v2-journal-main">
        <div className="v2-category-rail" aria-label="文章分類" data-motion="reveal">
          <button type="button" className={category === "all" ? "is-active" : ""} aria-pressed={category === "all"} onClick={() => { setCategory("all"); setVisible(PAGE_SIZE); }}>全部</button>
          {categories.map((item) => <button type="button" key={item.id} className={category === item.id ? "is-active" : ""} aria-pressed={category === item.id} onClick={() => { setCategory(item.id); setVisible(PAGE_SIZE); }}>{item.name}</button>)}
        </div>
        <div className="v2-result-bar" aria-live="polite">
          <span>{isFiltering ? "正在整理內容…" : `${filtered.length} 篇已發布文章`}</span>
          {(query || category !== "all") && <button type="button" onClick={clear}>清除篩選<X size={14} aria-hidden /></button>}
        </div>
        {isFiltering ? <div className="v2-skeleton-grid is-landscape" aria-label="文章載入中">{Array.from({ length: 3 }, (_, index) => <span key={index} />)}</div> : filtered.length ? (
          <div className="v2-journal-list" data-motion="cascade">
            {filtered.slice(0, visible).map((article, index) => <V2ArticleCard key={article.id} article={article} priority={index < 2} basePath={basePath} />)}
          </div>
        ) : articles.length === 0 && !query && category === "all" ? <div className="v2-journal-list is-preview" data-motion="cascade">{v2Assets.news.map((image, index) => <article className="v2-magazine-card" key={image.src}><div className="v2-magazine-card__image"><Image src={image.src} alt={image.alt} fill sizes="(max-width: 600px) 38vw, 170px" priority={index < 2} /><span>視覺示意</span></div><div className="v2-magazine-card__copy"><small>內容版位預覽</small><h3>{previewArticles[index]}</h3><p>正式文章將由 CMS 已發布內容取代。</p><b>文章準備中</b></div></article>)}</div> : <V2StatusPanel eyebrow="EDITORIAL QUEUE" title="沒有符合條件的文章。" description="調整關鍵字或分類，再找一次想讀的內容。" />}
        {filtered.length > visible && <button className="v2-load-more" type="button" onClick={() => setVisible((value) => value + PAGE_SIZE)}>載入更多</button>}
      </main>

      <aside className="v2-journal-sidebar" aria-label="文章工具">
        <section>
          <h2>文章搜尋</h2>
          <label className="v2-search-field">
            <Search size={17} aria-hidden />
            <span className="sr-only">搜尋文章</span>
            <input value={query} onChange={(event) => { setQuery(event.target.value); setVisible(PAGE_SIZE); }} placeholder="輸入關鍵字" type="search" />
            {query && <button type="button" onClick={() => setQuery("")} aria-label="清除搜尋"><X size={16} aria-hidden /></button>}
          </label>
        </section>
        {popular.length > 0 && <section><h2>熱門文章</h2><div className="v2-popular-articles">{popular.map((article) => <Link href={`${basePath}/${article.slug}`} key={article.id}><Image src={article.cover.src} alt="" width={72} height={48} /><span>{article.title}</span><ArrowRight size={14} aria-hidden /></Link>)}</div></section>}
        <section><h2>熱門標籤</h2><div className="v2-sidebar-tags">{categories.length > 0 ? categories.map((item) => <button type="button" key={item.id} onClick={() => { setCategory(item.id); setVisible(PAGE_SIZE); }}>{item.name}</button>) : <><span>短劇推薦</span><span>創作者</span><span>APP 教學</span><span>平台更新</span></>}</div></section>
      </aside>
    </div>
  );
}
