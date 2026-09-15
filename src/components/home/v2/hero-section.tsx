import Image from "next/image";
import Link from "next/link";
import { ArrowDownToLine, Play } from "lucide-react";

import type { V2HomeModel } from "@/features/v2/home-model";

export function V2HeroSection({ model }: { model: V2HomeModel }) {
  const previews = model.dramas.slice(0, 3);
  return (
    <section className="v2-hero" id="hero" aria-labelledby="v2-hero-title">
      <Image className="v2-hero-bg" src={model.hero.background.src} alt="" fill priority sizes="100vw" />
      <div className="v2-hero-shade" />
      <div className="v2-hero-inner">
        <div className="v2-hero-copy" data-motion="hero-copy">
          <span className="v2-hero-kicker"><i />{model.hero.eyebrow}</span>
          <h1 id="v2-hero-title"><span>{model.hero.title}</span><strong>{model.hero.subtitle}</strong></h1>
          <p className="v2-hero-description">{model.hero.description}</p>
          <div className="v2-hero-actions">
            <Link className="v2-cta v2-cta--primary" href="/explore"><Play size={16} fill="currentColor" aria-hidden />立即預覽</Link>
            <Link className="v2-cta v2-cta--line" href={model.hero.ctaHref}><ArrowDownToLine size={16} aria-hidden />{model.hero.ctaLabel}</Link>
          </div>
          <dl className="v2-hero-stats">
            <div><dt>{model.stats.dramas}</dt><dd>上線短劇</dd></div>
            <div><dt>{model.stats.creators}</dt><dd>創作者</dd></div>
            <div><dt>{model.stats.articles}</dt><dd>最新消息</dd></div>
          </dl>
        </div>

        <div className="v2-hero-device" data-motion="hero-posters">
          <div className="v2-device-glow" aria-hidden />
          <div className="v2-device-shell">
            <Image src={model.hero.device.src} alt={model.hero.device.alt} fill priority sizes="(max-width: 700px) 54vw, 300px" />
          </div>
          {previews.map((item, index) => (
            <Link className={`v2-floating-card is-${index + 1}`} href={item.href} key={item.href} aria-label={`預覽 ${item.title}`}>
              <Image src={item.image.src} alt="" fill sizes="130px" />
              <span>{item.title}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
