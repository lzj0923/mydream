import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { HeroBackground } from "@/components/prototype/hero-background";
import { JygNewsBrowser } from "@/components/prototype/news-browser";
import { getManagedContent, getManagedPage } from "@/content/cms/java-cms-client";
import { managedBlock, managedBlockProps, managedBlockStyle } from "@/content/cms/managed-page-style";
import { getSiteSettings } from "@/content/queries";
import { buildSeoMetadata } from "@/content/seo";
import { prototypeOfficialNewsArticles } from "@/data/jyg-news-prototype";
import { managedNewsArticles } from "@/features/jyg/managed-news";

export async function generateMetadata() {
  return buildSeoMetadata(await getSiteSettings(), {
    title: "最新消息",
    description: "掌握 My Dream 最新活動、平台更新與 AI 原創娛樂相關資訊。",
    path: "/news",
  });
}

export default async function NewsPage() {
  const [content, page] = await Promise.all([getManagedContent("article"), getManagedPage("/news", "zh-Hant")]);
  const articles = managedNewsArticles(content, prototypeOfficialNewsArticles);
  const hero = managedBlockProps(page, "hero");
  const library = managedBlockProps(page, "news-library");
  const text = (value: unknown, fallback: string) => typeof value === "string" && value.trim() ? value : fallback;
  return (
    <div className="jyg-prototype jyg-news-page">
      <section className="jyg-news-hero" data-nav-hero data-nav-hero-centered data-cms-zone="hero" style={managedBlockStyle(managedBlock(page, "hero"), { includeBackgroundImage: false, hero: true })}>
        <HeroBackground
          image={text(hero.backgroundUrl, "/assets/jyg/news-hero-information-dashboard.png")}
          alt="藍色數位資訊中心與全球資料視覺"
          theme="news"
          position={text(hero.backgroundPosition, "50% 50%")}
          mobilePosition={text(hero.mobileBackgroundPosition, "70% 50%")}
          priority
        />
        <div className="jyg-news-hero__planet" aria-hidden><i /><i /></div>
        <div className="jyg-shell jyg-news-hero__content" data-nav-hero-copy>
          <span data-cms-field="eyebrow">{text(hero.eyebrow, "LATEST NEWS")}</span>
          <h1 data-cms-field="title">{text(hero.title, "最新消息")}</h1>
          <h2 data-cms-field="subtitle">{text(hero.subtitle, "探索 MY DREAM 最新動態")}</h2>
          <p data-cms-field="description">{text(hero.description, "掌握 My Dream 最新活動、\n平台更新與 AI 原創娛樂相關資訊。")}</p>
          <Link href="#news-library">探索最新動態<ArrowRight aria-hidden /></Link>
        </div>
      </section>

      <section className="jyg-news-library" id="news-library" data-cms-zone="news-library" style={managedBlockStyle(managedBlock(page, "news-library"))}>
        <div className="jyg-shell">
          <header className="jyg-news-library__heading">
            <h2 data-cms-field="title">{text(library.title, "消息中心")}</h2>
            <h2 data-cms-field="subtitle">{text(hero.subtitle, "探索 MY DREAM 最新動態")}</h2>
          <p data-cms-field="description">{text(library.description, "瀏覽最新公告、活動與平台動態。")}</p>
          </header>
          <JygNewsBrowser articles={articles} />
        </div>
      </section>

    </div>
  );
}
