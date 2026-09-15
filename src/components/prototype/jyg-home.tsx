"use client";
import { sortWorksByHeat } from "@/features/jyg/home-featured-works-model";

import { useState, type CSSProperties } from "react";

import { HeroBackground } from "@/components/prototype/hero-background";
import { HomeWorkCard } from "@/components/prototype/home-work-card";
import { JygSectionHeading } from "@/components/prototype/jyg-prototype";
import {
  prototypeHomeCategories,
  prototypeHomeDramas,
} from "@/data/jyg-prototype";
import {
  jygHomeHeroFallback,
  type JygHomeHeroModel,
} from "@/features/jyg/home-hero-model";
import {
  jygFeaturedWorksFallback,
  type JygFeaturedWorksModel,
} from "@/features/jyg/home-featured-works-model";
import type { CmsPage } from "@/content/cms/java-cms-client";
import { findHomeBlock, parseCategoryLabels } from "@/content/cms/home-section-settings";

function managedBackground(url: unknown) {
  const value = typeof url === "string" ? url.trim() : "";
  return value ? `linear-gradient(rgba(3,8,18,.2),rgba(3,8,18,.38)),url(${JSON.stringify(value)})` : undefined;
}

function textVertical(value: unknown) {
  const position = String(value ?? "center");
  return position === "top" ? "flex-start" : position === "bottom" ? "flex-end" : "center";
}

function textOffset(value: unknown, paddingTop: number) {
  const position = String(value ?? "center");
  const spacing = Math.min(Math.max(paddingTop - 12, 0), 64);
  if (position === "top") return `${-spacing}px`;
  if (position === "bottom") return `${spacing}px`;
  return "0px";
}

export function JygPrototypeHome({
  hero = jygHomeHeroFallback,
  featuredWorks = jygFeaturedWorksFallback,
  discoveryWorks,
  page,
  previewSection,
}: {
  hero?: JygHomeHeroModel;
  featuredWorks?: JygFeaturedWorksModel;
  discoveryWorks?: JygFeaturedWorksModel;
  page?: CmsPage | null;
  previewSection?: string;
}) {
  const [activeCategory, setActiveCategory] = useState("all");
  const duJingWu = prototypeHomeDramas.find((drama) => drama.slug === "du-jing-wu");
  const unsortedFeaturedItems = featuredWorks.source === "prototype" && duJingWu && !featuredWorks.items.some((drama) => drama.slug === duJingWu.slug)
    ? [{ ...duJingWu, href: `/works/${duJingWu.slug}`, isNew: true }, ...featuredWorks.items].slice(0, 12)
    : featuredWorks.items;
  const featuredItems = sortWorksByHeat(unsortedFeaturedItems);
  const categoryItems = discoveryWorks ? sortWorksByHeat(discoveryWorks.items) : featuredItems;
  const sectionBlock = findHomeBlock(page, "section-heading");
  const sectionProps = sectionBlock?.props ?? {};
  const sectionStyle = sectionBlock?.style ?? {};
  const categoryBlock = findHomeBlock(page, "category-tabs");
  const categoryProps = categoryBlock?.props ?? {};
  const categoryStyle = categoryBlock?.style ?? {};
  const categoryLabels = parseCategoryLabels(categoryProps.categoryLabels, prototypeHomeCategories.map((category) => category.label));
  const categories = prototypeHomeCategories.map((category, index) => ({ ...category, label: categoryLabels[index] }));
  const activeCategoryLabel = prototypeHomeCategories.find((category) => category.value === activeCategory)?.label;
  const libraryPaddingTop = Number(sectionStyle.paddingTop ?? 64);
  const categoryPaddingTop = Number(categoryStyle.paddingTop ?? 72);
  const categoryDramas = activeCategory === "all"
    ? categoryItems.slice(0, 6)
    : categoryItems.filter((drama) => activeCategory === "short-drama" ? drama.format === "AI短劇" : Boolean(activeCategoryLabel && (drama.genres?.some((genre) => genre === activeCategoryLabel) ?? drama.genre === activeCategoryLabel))).slice(0, 6);
  const heroStyle = {
    "--cms-hero-title-color": String(hero.style?.titleColor ?? "#f4c542"),
    "--cms-hero-subtitle-color": String(hero.style?.textColor ?? hero.style?.titleColor ?? "#ffd369"),
    "--cms-hero-title-size": `${Number(hero.style?.titleFontSize ?? 56)}px`,
    "--cms-hero-description-color": String(hero.style?.descriptionColor ?? "#cad6e7"),
    "--cms-hero-eyebrow-color": String(hero.style?.eyebrowColor ?? "#ffffff"),
    "--cms-hero-copy-width": `${Number(hero.style?.copyWidth ?? 620)}px`,
    "--cms-hero-overlay": Math.min(1, Math.max(0, Number(hero.style?.overlay ?? 0.3))),
    "--cms-text-vertical": textVertical(hero.style?.verticalAlign),
  } as CSSProperties;
  const libraryStyle = {
    backgroundColor: String(sectionStyle.backgroundColor ?? "#060b16"),
    backgroundImage: managedBackground(sectionProps.backgroundUrl),
    backgroundPosition: String(sectionProps.backgroundPosition ?? "center center"),
    backgroundSize: "cover",
    paddingTop: `${libraryPaddingTop}px`,
    paddingBottom: `${Number(sectionStyle.paddingBottom ?? 82)}px`,
    "--cms-grid-columns": Number(sectionStyle.columns ?? 6),
    "--cms-grid-gap": `${Number(sectionStyle.gap ?? 12)}px`,
    "--cms-text-vertical": textVertical(sectionStyle.verticalAlign),
    "--cms-text-offset": textOffset(sectionStyle.verticalAlign, libraryPaddingTop),
    "--cms-title-offset": textOffset(sectionStyle.verticalAlign, libraryPaddingTop),
  } as CSSProperties;
  const discoveryStyle = {
    backgroundColor: String(categoryStyle.backgroundColor ?? "#07101d"),
    backgroundImage: managedBackground(categoryProps.backgroundUrl),
    backgroundPosition: String(categoryProps.backgroundPosition ?? "center center"),
    backgroundSize: "cover",
    paddingTop: `${categoryPaddingTop}px`,
    paddingBottom: `${Number(categoryStyle.paddingBottom ?? 72)}px`,
    "--cms-grid-columns": Number(categoryStyle.columns ?? 6),
    "--cms-grid-gap": `${Number(categoryStyle.gap ?? 12)}px`,
    "--cms-category-title-color": String(categoryStyle.titleColor ?? "#f4c542"),
    "--cms-category-title-size": `${Number(categoryStyle.titleFontSize ?? 34)}px`,
    "--cms-category-description-color": String(categoryStyle.descriptionColor ?? "#aabbd0"),
    "--cms-category-eyebrow-color": String(categoryStyle.eyebrowColor ?? "#19bfff"),
    "--cms-text-vertical": textVertical(categoryStyle.verticalAlign),
    "--cms-text-offset": textOffset(categoryStyle.verticalAlign, categoryPaddingTop),
    "--cms-title-offset": textOffset(categoryStyle.verticalAlign, categoryPaddingTop),
  } as CSSProperties;

  return (
    <div className="jyg-prototype jyg-content-home">
      <section className="jyg-home-hero" data-nav-hero data-nav-hero-centered style={heroStyle} data-align={String(hero.style?.align ?? "left")} data-vertical-align={String(hero.style?.verticalAlign ?? "center")} data-cms-section="hero" data-preview-active={previewSection === "hero"}>
        <HeroBackground
          image={hero.background.src}
          video={hero.backgroundVideo}
          alt={hero.background.alt}
          theme="home"
          position={String(hero.style?.backgroundPosition ?? "50% 0%")}
          mobilePosition={String(hero.style?.mobileBackgroundPosition ?? "65% 50%")}
          priority
        />
        <div className="jyg-shell jyg-home-hero__content">
          <div className="jyg-home-hero__copy" data-nav-hero-copy>
            <span className="jyg-eyebrow">{hero.eyebrow}</span>
            <h1 data-cms-field="title">{hero.title}</h1>
            <h2 data-cms-field="subtitle">{hero.subtitle}</h2>
            <p data-cms-field="description">{hero.description}</p>
          </div>
        </div>
      </section>

      <section className="jyg-section jyg-drama-library" id="ai-universe" style={libraryStyle} data-align={String(sectionStyle.align ?? "left")} data-vertical-align={String(sectionStyle.verticalAlign ?? "center")} data-cms-section="section-heading" data-preview-active={previewSection === "section-heading"}>
        <div className="jyg-shell">
          <JygSectionHeading
            eyebrow={String(sectionProps.eyebrow ?? "HOT AI ORIGINALS")}
            title={String(sectionProps.title ?? "熱門 AI 原創作品")}
            description={String(sectionProps.description ?? "12 部 AI 短劇、漫劇與動畫集中展示，從都市情感到科幻懸疑，快速找到現在就想看的故事。")}
            action={{ label: String(sectionProps.actionLabel ?? "查看全部作品"), href: "/works" }}
            style={{
              eyebrowColor: String(sectionStyle.eyebrowColor ?? "#19bfff"),
              titleColor: String(sectionStyle.titleColor ?? "#f4c542"),
              descriptionColor: String(sectionStyle.descriptionColor ?? "#b9c7da"),
              titleFontSize: Number(sectionStyle.titleFontSize ?? 44),
            }}
          />
          <div className="jyg-drama-grid">
            {featuredItems.map((drama, index) => (
              <HomeWorkCard work={drama} isNew={drama.isNew ?? (drama.slug === "du-jing-wu" || (featuredWorks.source === "prototype" && index < 4))} key={drama.slug} />
            ))}
          </div>
        </div>
      </section>

      <section className="jyg-section jyg-work-discovery" aria-labelledby="home-category-title" style={discoveryStyle} data-align={String(categoryStyle.align ?? "left")} data-vertical-align={String(categoryStyle.verticalAlign ?? "center")} data-cms-section="category-tabs" data-preview-active={previewSection === "category-tabs"}>
        <div className="jyg-shell">
          <div className="jyg-work-discovery__head">
            <div>
              <h2 id="home-category-title">{String(categoryProps.title ?? "按分類探索作品")}</h2>
            </div>
          </div>
          <div className="jyg-work-tabs" role="tablist" aria-label="作品分類">
            {categories.map((category) => (
              <button
                type="button"
                role="tab"
                aria-selected={activeCategory === category.value}
                aria-controls="home-category-panel"
                onClick={() => setActiveCategory(category.value)}
                key={category.value}
              >
                {category.label}
              </button>
            ))}
          </div>
          <div className="jyg-drama-grid" id="home-category-panel" role="tabpanel" aria-live="polite">
            {categoryDramas.map((drama) => (
              <HomeWorkCard work={drama} key={`${activeCategory}-${drama.slug}`} />
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
