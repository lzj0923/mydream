import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

type HeroImage = { src: string; alt: string };
type Breadcrumb = { label: string; href?: string };
type HeroCta = { label: string; href: string };

export function V2PageHero({
  eyebrow,
  title,
  subtitle,
  description,
  background,
  breadcrumbs = [],
  primaryCta,
  secondaryCta,
  visual,
  variant = "cinematic",
  align = "left",
  cmsZone,
  style,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  description: string;
  background: HeroImage;
  breadcrumbs?: Breadcrumb[];
  primaryCta?: HeroCta;
  secondaryCta?: HeroCta;
  visual?: React.ReactNode;
  variant?: "cinematic" | "compact";
  align?: "left" | "center";
  cmsZone?: string;
  style?: React.CSSProperties;
}) {
  return (
    <section className={`v2-page-hero v2-page-hero--${variant} is-${align}`} data-nav-hero={cmsZone === "hero" || undefined} data-nav-hero-centered={cmsZone === "hero" || undefined} data-cms-zone={cmsZone} style={style}>
      <Image
        className="v2-page-hero__background"
        data-motion="page-hero-background"
        data-cms-field={cmsZone ? "backgroundUrl" : undefined}
        src={background.src}
        alt={background.alt}
        fill
        priority
        sizes="100vw"
        unoptimized={background.src.startsWith("http")}
      />
      <div className="v2-page-hero__scrim" />
      <div className="v2-page-hero__glow" aria-hidden />
      <div className="v2-page-hero__inner">
        <div className="v2-page-hero__copy" data-nav-hero-copy={cmsZone === "hero" || undefined} data-motion="page-hero-copy">
          {breadcrumbs.length > 0 && (
            <nav className="v2-breadcrumbs" aria-label="Breadcrumb">
              <ol>
                {breadcrumbs.map((item, index) => (
                  <li key={`${item.label}-${index}`}>
                    {item.href ? <Link href={item.href}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
                  </li>
                ))}
              </ol>
            </nav>
          )}
          <span className="v2-page-kicker" data-cms-field={cmsZone ? "eyebrow" : undefined}>{eyebrow}</span>
          <h1 data-cms-field={cmsZone ? "title" : undefined}>{title}</h1>
          {subtitle !== undefined && <h2 data-cms-field={cmsZone ? "subtitle" : undefined}>{subtitle}</h2>}
          <p className="v2-page-hero__description" data-cms-field={cmsZone ? "description" : undefined}>{description}</p>
          {(primaryCta || secondaryCta) && (
            <div className="v2-page-actions">
              {primaryCta && <Link className="v2-cta v2-cta--primary" href={primaryCta.href}>{primaryCta.label}<ArrowRight size={17} aria-hidden /></Link>}
              {secondaryCta && <Link className="v2-cta v2-cta--line" href={secondaryCta.href}>{secondaryCta.label}<ArrowRight size={17} aria-hidden /></Link>}
            </div>
          )}
        </div>
        {visual && <div className="v2-page-hero__visual" data-motion="page-hero-visual">{visual}</div>}
      </div>
    </section>
  );
}
