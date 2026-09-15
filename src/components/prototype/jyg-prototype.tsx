import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import {
  ArrowRight,
  AudioLines,
  BadgeCheck,
  BookOpen,
  Bot,
  Boxes,
  Clapperboard,
  Film,
  Globe2,
  Orbit,
  Sparkles,
  Users,
} from "lucide-react";

import {
  type PrototypeCharacter,
  type PrototypeIp,
  type PrototypeWork,
  contentMatrix,
} from "@/data/jyg-prototype";
import { BrandLogo } from "@/components/brand/brand-logo";
import type { CmsBlock } from "@/content/cms/java-cms-client";
import { managedBlockStyle, managedFieldStyle } from "@/content/cms/managed-page-style";

const matrixIcons = {
  comics: BookOpen,
  "comic-drama": Clapperboard,
  animation: Film,
  music: AudioLines,
  characters: Users,
  licensing: BadgeCheck,
};

export function PrototypeFlag() {
  return <span className="jyg-prototype-flag">Phase 5A-1 · Frontend Prototype</span>;
}

export function PrototypeBrandMark({ className = "" }: { className?: string }) {
  return <BrandLogo className={`jyg-prototype-brand-mark ${className}`.trim()} markOnly />;
}

export function JygSectionHeading({
  title,
  description,
  action,
  style,
  cmsFields = false,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: { label: string; href: string };
  cmsFields?: boolean;
  style?: {
    eyebrowColor?: string;
    titleColor?: string;
    descriptionColor?: string;
    titleFontSize?: number;
  };
}) {
  return (
    <header className="jyg-section-heading">
      <div>
        <h2 data-cms-field={cmsFields ? "title" : undefined} style={{ color: style?.titleColor, fontSize: style?.titleFontSize ? `${style.titleFontSize}px` : undefined } as CSSProperties}>{title}</h2>
        {(description || cmsFields) && <p data-cms-field={cmsFields ? "description" : undefined} style={{ color: style?.descriptionColor }}>{description}</p>}
      </div>
      {action && <Link href={action.href}>{action.label}<ArrowRight size={16} aria-hidden /></Link>}
    </header>
  );
}

export function JygIpCard({ item, featured = false }: { item: PrototypeIp; featured?: boolean }) {
  return (
    <Link href={`/ips/${item.slug}`} className={`jyg-ip-card jyg-accent-${item.accent}${featured ? " is-featured" : ""}`}>
      <Image src={item.image.src} alt={item.image.alt} fill sizes={featured ? "(max-width: 700px) 86vw, 620px" : "(max-width: 700px) 78vw, 360px"} style={{ objectPosition: item.image.position }} unoptimized />
      <span className="jyg-card-scrim" />
      <span className="jyg-ip-card__index" aria-hidden>{String(prototypeIndex(item.slug) + 1).padStart(2, "0")}</span>
      <span className="jyg-ip-card__body">
        <small>{item.category}</small>
        <strong>{item.name}</strong>
        <p>{item.description}</p>
        <b>進入世界 <ArrowRight size={14} aria-hidden /></b>
      </span>
    </Link>
  );
}

function prototypeIndex(slug: string) {
  const indexes: Record<string, number> = { "journey-taiwan": 0, "shanhai-archive": 1, "future-echo": 2, "immortal-sky": 3 };
  return indexes[slug] ?? 0;
}

export function JygCharacterCard({ item }: { item: PrototypeCharacter }) {
  return (
    <Link href={`/characters/${item.slug}`} className={`jyg-character-card jyg-accent-${item.accent}`}>
      <span className="jyg-character-card__visual">
        <Image src={item.image.src} alt={item.image.alt} fill sizes="(max-width: 600px) 66vw, 280px" style={{ objectPosition: item.image.position }} unoptimized />
      </span>
      <span className="jyg-character-card__body">
        <small>{item.ipName}</small>
        <strong>{item.name}</strong>
        <span>{item.title}</span>
        <p>{item.profile}</p>
      </span>
      <ArrowRight className="jyg-card-arrow" size={18} aria-hidden />
    </Link>
  );
}

export function JygWorkCard({ item, wide = false }: { item: PrototypeWork; wide?: boolean }) {
  return (
    <Link href={`/works/${item.slug}`} className={`jyg-work-card${wide ? " is-wide" : ""}`}>
      <span className="jyg-work-card__visual">
        <Image src={item.image.src} alt={item.image.alt} fill sizes={wide ? "(max-width: 700px) 92vw, 650px" : "(max-width: 700px) 78vw, 420px"} style={{ objectPosition: item.image.position }} unoptimized />
      </span>
      <span className="jyg-work-card__body">
        <span className="jyg-work-card__meta"><b>{item.type}</b><em>{item.status}</em></span>
        <strong>{item.title}</strong>
        <small>{item.ipName}</small>
        <p>{item.description}</p>
      </span>
    </Link>
  );
}

export function JygContentMatrix() {
  return (
    <div className="jyg-matrix-grid">
      {contentMatrix.map((item) => {
        const Icon = matrixIcons[item.key];
        return (
          <Link key={item.key} href={item.href} className="jyg-matrix-card">
            <Icon aria-hidden />
            <span><strong>{item.title}</strong><p>{item.description}</p></span>
            <ArrowRight size={17} aria-hidden />
          </Link>
        );
      })}
    </div>
  );
}

export function JygPageHero({
  subtitle,
  children,
  title,
  description,
  image,
  imagePosition = "center",
  metric,
  prototypeMeta = true,
  className = "",
  cmsBlock,
}: {
  subtitle?: string;
  children?: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  image?: string;
  imagePosition?: string;
  metric?: string;
  prototypeMeta?: boolean;
  className?: string;
  cmsBlock?: CmsBlock;
}) {
  return (
    <section className={`jyg-page-hero${className ? ` ${className}` : ""}`} data-nav-hero={className === "jyg-page-hero--all-works" || undefined} data-nav-hero-centered={className === "jyg-page-hero--all-works" || undefined} data-cms-zone={cmsBlock?.zone} style={cmsBlock ? managedBlockStyle(cmsBlock, { includeBackgroundImage: false, hero: true }) : undefined}>
      {image && <Image src={image} alt="" fill priority loading="eager" sizes="100vw" data-cms-field={cmsBlock ? "backgroundUrl" : undefined} style={{ objectPosition: imagePosition }} unoptimized />}
      <div className="jyg-page-hero__veil" />
      <div className="jyg-shell jyg-page-hero__content" data-nav-hero-copy={className === "jyg-page-hero--all-works" || undefined}>
        {prototypeMeta ? <><PrototypeBrandMark /><PrototypeFlag /></> : null}
        <h1 data-cms-field={cmsBlock ? "title" : undefined} style={cmsBlock ? managedFieldStyle(cmsBlock, "title") : undefined}>{title}</h1>
        {subtitle !== undefined && <h2 data-cms-field="subtitle">{subtitle}</h2>}
        <p data-cms-field={cmsBlock ? "description" : undefined} style={cmsBlock ? managedFieldStyle(cmsBlock, "description") : undefined}>{description}</p>
        {metric && <strong>{metric}</strong>}
        {children}
      </div>
    </section>
  );
}

export function JygPrototypeNotice() {
  return (
    <aside className="jyg-prototype-notice">
      <Bot size={17} aria-hidden />
      <span>本頁為品牌與信息架構原型，尚未連接新 CMS Collection。</span>
    </aside>
  );
}

export function JygUniverseSignal() {
  return (
    <div className="jyg-universe-signal" aria-hidden>
      <Orbit />
      <span><i /><i /><i /></span>
      <Globe2 />
      <span><i /><i /></span>
      <Boxes />
      <span><i /><i /><i /></span>
      <Sparkles />
    </div>
  );
}
