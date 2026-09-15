"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Search,
  X,
} from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

import type { Article } from "@/content/types";
import { NEWS_CATEGORY_LABELS, newsCategoryLabel } from "@/features/jyg/news-categories";

const NEWS_TABS = [
  { id: "all", label: "全部" },
  ...NEWS_CATEGORY_LABELS.map((label) => ({ id: label, label: newsCategoryLabel(label), category: label })),
] as const;

const PAGE_SIZE = 6;
const NEWS_TAGS = ["AI創作", "AI短劇", "AI工具", "AI技術", "娛樂科技"];

export function JygNewsBrowser({ articles }: { articles: Article[] }) {
  const [activeTab, setActiveTab] = useState("all");
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const deferredQuery = useDeferredValue(query);

  const filtered = useMemo(() => {
    const tab = NEWS_TABS.find((item) => item.id === activeTab);
    const needle = deferredQuery.trim().toLocaleLowerCase("zh-Hant");

    return articles.filter((article) => {
      const tabMatch = !tab || !("category" in tab) || article.category === tab.category;
      const searchText = `${article.title} ${article.excerpt} ${newsCategoryLabel(article.category)} ${article.author}`.toLocaleLowerCase("zh-Hant");
      return tabMatch && (!needle || searchText.includes(needle));
    });
  }, [activeTab, articles, deferredQuery]);

  const visibleArticles = filtered.slice(0, visible);
  const popular = articles.filter((article) => article.category === "SEO文章").slice(0, 4);

  return (
    <>
      <section className="jyg-news-category-nav" aria-label="最新消息分類">
        <div className="jyg-news-toolbar">
          <nav className="jyg-news-tabs">
            {NEWS_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  className={isActive ? "is-active" : ""}
                  type="button"
                  key={tab.id}
                  aria-pressed={isActive}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setVisible(PAGE_SIZE);
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </section>

      <div className="jyg-news-layout">
        <main className="jyg-news-main">
          <div className="jyg-news-result" aria-live="polite">
            <span><strong>{String(filtered.length).padStart(2, "0")}</strong> 篇最新消息</span>
            {(query || activeTab !== "all") && (
              <button type="button" onClick={() => { setQuery(""); setActiveTab("all"); }}>
                清除篩選<X aria-hidden />
              </button>
            )}
          </div>

          {visibleArticles.length ? (
              <div className="jyg-news-article-grid">
                {visibleArticles.map((article, index) => (
                  <article className="jyg-news-article" key={article.id}>
                    <Link href={`/news/${article.slug}`}>
                      <div className="jyg-news-article__image">
                        <Image src={article.cover.src} alt={article.cover.alt} fill sizes="(max-width: 700px) 100vw, 23vw" priority={index < 2} unoptimized={article.cover.src.startsWith("http")} />
                        <span>{newsCategoryLabel(article.category)}</span>
                      </div>
                      <div className="jyg-news-article__copy">
                        <h2>{article.title}</h2>
                        <p>{article.excerpt}</p>
                        <small><CalendarDays aria-hidden /><time dateTime={article.publishedAt}>{article.publishedAt}</time></small>
                        <b>閱讀全文<ArrowRight aria-hidden /></b>
                      </div>
                    </Link>
                  </article>
                ))}
              </div>
          ) : (
            <div className="jyg-news-empty">
              <h2>目前沒有符合條件的文章</h2><p>請調整分類或搜尋關鍵字。</p>
            </div>
          )}

          {filtered.length > visible && (
            <button className="jyg-news-more" type="button" onClick={() => setVisible((value) => value + PAGE_SIZE)}>
              載入更多文章<ArrowRight aria-hidden />
            </button>
          )}
        </main>

        <aside className="jyg-news-sidebar" aria-label="最新消息文章工具">
          <label className="jyg-news-search jyg-news-sidebar__search">
            <span className="sr-only">搜尋文章</span>
            <input
              type="search"
              value={query}
              placeholder="搜尋文章標題..."
              onChange={(event) => {
                setQuery(event.target.value);
                setVisible(PAGE_SIZE);
              }}
            />
            {query ? (
              <button type="button" aria-label="清除搜尋" onClick={() => setQuery("")}>
                <X aria-hidden />
              </button>
            ) : (
              <Search aria-hidden />
            )}
          </label>

          {popular.length > 0 && (
            <section>
              <h2>熱門 SEO文章</h2>
              <div className="jyg-news-popular">
                {popular.map((article, index) => (
                  <Link href={`/news/${article.slug}`} key={article.id}>
                    <b>{String(index + 1).padStart(2, "0")}</b>
                    <Image src={article.cover.src} alt="" width={76} height={52} unoptimized={article.cover.src.startsWith("http")} />
                    <span>{article.title}</span>
                    <ArrowRight aria-hidden />
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2>最新標籤</h2>
            <div className="jyg-news-tags">{NEWS_TAGS.map((tag) => <span key={tag}>{tag}</span>)}</div>
          </section>
        </aside>
      </div>
    </>
  );
}
