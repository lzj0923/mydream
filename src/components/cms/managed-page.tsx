/* eslint-disable @next/next/no-img-element -- CMS media URLs and dimensions are dynamic. */
import Link from "next/link";

import type { CSSProperties, ReactNode } from "react";
import type { CmsBlock, CmsPage } from "@/content/cms/java-cms-client";

type JsonObject = Record<string, unknown>;
type ManagedCssProperties = CSSProperties & Record<`--${string}`, string | number | undefined>;

const text = (value: unknown) => typeof value === "string" ? value : "";
const number = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : undefined;
const strings = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

function safeUrl(value: unknown) {
  const url = text(value).trim();
  if (!url || /^(?:javascript|data):/i.test(url) || url.includes("\\")) return "";
  return url.startsWith("/") || /^https?:\/\//i.test(url) ? url : "";
}

function safeStyle(style: JsonObject): ManagedCssProperties {
  const backgroundImage = safeUrl(style.backgroundMediaUrl);
  const verticalAlign = text(style.verticalAlign);
  const verticalCss = verticalAlign === "top" ? "flex-start" : verticalAlign === "bottom" ? "flex-end" : verticalAlign === "center" ? "center" : undefined;
  const contentVerticalCss = verticalAlign === "top" ? "start" : verticalAlign === "bottom" ? "end" : verticalAlign === "center" ? "center" : undefined;
  return {
    color: text(style.textColor) || undefined,
    backgroundColor: text(style.background) || undefined,
    backgroundImage: backgroundImage ? `url("${backgroundImage.replace(/["\\]/g, "")}")` : undefined,
    textAlign: ["left", "center", "right"].includes(text(style.align)) ? text(style.align) as CSSProperties["textAlign"] : undefined,
    maxWidth: number(style.maxWidth),
    minHeight: number(style.minHeight),
    paddingTop: number(style.paddingTop),
    paddingBottom: number(style.paddingBottom),
    gap: number(style.gap),
    borderRadius: number(style.radius),
    "--cms-text-vertical": verticalCss,
    "--cms-text-content": contentVerticalCss,
  };
}

function Action({ label, href }: { label: unknown; href: unknown }) {
  const safeHref = safeUrl(href);
  if (!text(label) || !safeHref) return null;
  return <Link className="cms-button" href={safeHref}>{text(label)}</Link>;
}

function Cards({ items }: { items: unknown }) {
  if (!Array.isArray(items)) return null;
  return <div className="cms-card-grid">{items.map((raw, index) => {
    const item = raw && typeof raw === "object" ? raw as JsonObject : {};
    const image = safeUrl(item.imageUrl ?? item.coverUrl);
    return <article className="cms-card" key={text(item.id) || index}>
      {image ? <img src={image} alt={text(item.imageAlt) || text(item.title)} /> : null}
      {text(item.eyebrow) ? <small>{text(item.eyebrow)}</small> : null}
      <h3>{text(item.title)}</h3>
      {text(item.description) ? <p>{text(item.description)}</p> : null}
      <Action label={item.ctaLabel} href={item.ctaHref} />
    </article>;
  })}</div>;
}

function BlockFrame({ block, children, className = "" }: { block: CmsBlock; children: ReactNode; className?: string }) {
  const variant = text(block.style.variant).replace(/[^a-z0-9_-]/gi, "");
  return <section className={`cms-block cms-block--${block.type} ${variant ? `cms-block--${variant}` : ""} ${className}`}
    style={safeStyle(block.style)} data-block-id={block.id}>{children}</section>;
}

export function ManagedBlock({ block }: { block: CmsBlock }) {
  const p = block.props;
  if (block.type === "spacer") return <div aria-hidden style={{ height: Math.min(number(p.height) ?? 48, 400) }} />;
  if (block.type === "hero") {
    const background = safeUrl(p.backgroundUrl);
    return <BlockFrame block={block} className="cms-hero">
      {background ? <img className="cms-hero__background" src={background} alt={text(p.backgroundAlt)} /> : null}
      <div className="cms-block__inner">
        {text(p.eyebrow) ? <p className="cms-eyebrow">{text(p.eyebrow)}</p> : null}
        <h1>{text(p.title)}</h1><p className="cms-lead">{text(p.subtitle)}</p><p>{text(p.description)}</p>
        <div className="cms-actions"><Action label={p.ctaLabel} href={p.ctaHref} /><Action label={p.secondaryCtaLabel} href={p.secondaryCtaHref} /></div>
      </div>
    </BlockFrame>;
  }
  if (block.type === "video-player") {
    const source = safeUrl(p.url ?? p.videoUrl);
    return <BlockFrame block={block}><div className="cms-block__inner">
      {text(p.title) ? <h2>{text(p.title)}</h2> : null}
      {source ? <video controls preload="metadata" poster={safeUrl(p.posterUrl) || undefined}><source src={source} /></video> : null}
    </div></BlockFrame>;
  }
  if (block.type === "image-gallery") {
    const images = Array.isArray(p.images) ? p.images : [];
    return <BlockFrame block={block}><div className="cms-block__inner cms-gallery">{images.map((raw, index) => {
      const image = raw && typeof raw === "object" ? raw as JsonObject : {};
      const source = safeUrl(image.url);
      return source ? <figure key={text(image.id) || index}><img src={source} alt={text(image.alt)} />{text(image.caption) ? <figcaption>{text(image.caption)}</figcaption> : null}</figure> : null;
    })}</div></BlockFrame>;
  }
  if (["work-grid", "content-grid", "feature-cards", "pricing-grid", "episode-list"].includes(block.type)) {
    return <BlockFrame block={block}><div className="cms-block__inner"><h2>{text(p.title)}</h2><p>{text(p.description)}</p><Cards items={p.items} /></div></BlockFrame>;
  }
  if (block.type === "rich-text" || block.type === "legal-document") {
    const paragraphs = strings(p.paragraphs ?? p.body);
    return <BlockFrame block={block}><div className="cms-block__inner cms-prose"><h2>{text(p.title)}</h2>{paragraphs.map((line, index) => <p key={index}>{line}</p>)}</div></BlockFrame>;
  }
  if (block.type === "contact-form") {
    return <BlockFrame block={block}><div className="cms-block__inner"><h2>{text(p.title)}</h2><p>{text(p.description)}</p><p className="cms-form-note">{text(p.formKey) ? `表單：${text(p.formKey)}` : ""}</p></div></BlockFrame>;
  }
  return <BlockFrame block={block}><div className="cms-block__inner">
    {text(p.eyebrow) ? <p className="cms-eyebrow">{text(p.eyebrow)}</p> : null}
    <h2>{text(p.title)}</h2><p>{text(p.subtitle || p.description)}</p>
    <Action label={p.ctaLabel} href={p.ctaHref} />
  </div></BlockFrame>;
}

export function ManagedPage({ page }: { page: CmsPage }) {
  return <div className="cms-managed-page">{page.blocks.map((block) => <ManagedBlock key={block.id} block={block} />)}</div>;
}
