import Link from "next/link";
import { CirclePlay, Crown, Heart } from "lucide-react";

import { HomeWorkCard, type HomeWorkCardItem } from "@/components/prototype/home-work-card";
import { JygPageHero, JygPrototypeNotice, JygSectionHeading, JygWorkCard } from "@/components/prototype/jyg-prototype";
import { prototypeWorks } from "@/data/jyg-prototype";
import type { CmsPage } from "@/content/cms/java-cms-client";
import { managedBlock, managedBlockStyle, managedFieldText } from "@/content/cms/managed-page-style";
import { allWorksHeroBackground, defaultWorksSectionBlocks, worksHeroProps } from "@/content/cms/works-page-settings";

const filters = [
  { label: "全部作品", href: "/works", type: undefined },
  { label: "AI漫畫", href: "/works/comics", type: "comics" },
  { label: "AI漫劇", href: "/works/comic-drama", type: "comic-drama" },
  { label: "AI動畫", href: "/works/animation", type: "animation" },
  { label: "AI音樂", href: "/works/music", type: "music" },
] as const;

export function JygWorksIndex({ type }: { type?: "comics" | "comic-drama" | "animation" | "music" }) {
  const active = filters.find((item) => item.type === type) ?? filters[0];
  const works = type ? prototypeWorks.filter((item) => item.typeSlug === type) : prototypeWorks;

  return (
    <div className="jyg-prototype">
      <JygPageHero
        eyebrow=""
        title={type ? active.label : "作品中心"}
        description={type ? `探索劇有梗正在孵化與開發的${active.label}原型。` : "從漫畫、漫劇、動畫到音樂，讓同一個 IP 在不同媒介持續成長。"}
        image="/cms-media/prototype/jyg/ai-universe-hero.webp"
        imagePosition="70% center"
        metric={undefined}
      />
      <div className="jyg-shell"><JygPrototypeNotice /></div>
      <section className="jyg-section jyg-section--tight">
        <div className="jyg-shell">
          <nav className="jyg-filter-nav" aria-label="作品類型">
            {filters.map((item) => <Link key={item.href} href={item.href} aria-current={item.type === type ? "page" : undefined}>{item.label}</Link>)}
          </nav>
          <JygSectionHeading eyebrow="" title={active.label} description="所有內容均為 Phase 5A-1 mock prototype，不讀取新的 CMS Collection。" />
          {works.length > 0 ? <div className="jyg-work-grid">{works.map((item) => <JygWorkCard key={item.slug} item={item} />)}</div> : <div className="jyg-empty-state"><strong>內容孵化中</strong><p>此分類會在 CMS Schema 確認後進入正式內容建置。</p></div>}
        </div>
      </section>
    </div>
  );
}

export function JygAllWorksPage({ works, page }: { works: HomeWorkCardItem[]; page?: CmsPage | null }) {
  const defaults = defaultWorksSectionBlocks();
  const savedHero = managedBlock(page, "hero") ?? { ...defaults[0], id: "works-hero" };
  const hero = { ...savedHero, props: worksHeroProps(savedHero.props) };
  const library = managedBlock(page, "works-library") ?? { ...defaults[1], id: "works-library" };
  return (
    <div className="jyg-prototype jyg-all-works-page">
      <JygPageHero
        className="jyg-page-hero--all-works"
        eyebrow=""
        title={managedFieldText(hero.props.title, "")}
        subtitle={managedFieldText(hero.props.subtitle, "")}
        description={managedFieldText(hero.props.description, "")}
        image={typeof hero.props.backgroundUrl === "string" && hero.props.backgroundUrl ? hero.props.backgroundUrl : allWorksHeroBackground}
        imagePosition={managedFieldText(hero.props.backgroundPosition, "70% center")}
        cmsBlock={hero}
        metric={undefined}
        prototypeMeta={false}
      >
        <div className="jyg-works-hero-features">
          {(["One", "Two", "Three"] as const).map((key, index) => {
            const Icon = [CirclePlay, Crown, Heart][index];
            return <div key={key}><Icon aria-hidden /><div><strong data-cms-field={`feature${key}Title`}>{managedFieldText(hero.props[`feature${key}Title`], "")}</strong><small data-cms-field={`feature${key}Description`}>{managedFieldText(hero.props[`feature${key}Description`], "")}</small></div></div>;
          })}
        </div>
      </JygPageHero>
      <section className="jyg-section jyg-section--tight" data-cms-zone="works-library" style={managedBlockStyle(library)}>
        <div className="jyg-shell">
          <JygSectionHeading eyebrow="" title={managedFieldText(library.props.title, "")} description={managedFieldText(library.props.description, "")} cmsFields style={library.style} />
          {works.length ? <div className="jyg-drama-grid">{works.map((work, index) => <HomeWorkCard work={work} isNew={work.isNew} rank={index + 1} key={work.slug} />)}</div> : <div className="jyg-empty-state"><strong>作品準備中</strong><p>已發布作品將在這裡顯示。</p></div>}
        </div>
      </section>
    </div>
  );
}
