import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Flame, Play } from "lucide-react";

import type { HomeWorkCardItem } from "@/features/jyg/home-featured-works-model";
export type { HomeWorkCardItem } from "@/features/jyg/home-featured-works-model";

export function HomeWorkCard({ work, isNew = false, rank }: { work: HomeWorkCardItem; isNew?: boolean; rank?: number }) {
  const href = work.href ?? `/works/${work.slug}`;
  return (
    <article className="jyg-drama-card">
      <Link
        className="jyg-drama-card__visual"
        href={href}
        aria-label={`播放《${work.title}》`}
      >
        <Image src={work.image.src} alt={work.image.alt} fill sizes="(max-width: 700px) 45vw, (max-width: 1040px) 24vw, 16vw" unoptimized />
        <span className="jyg-drama-card__badges">
          {rank ? <strong className="jyg-drama-card__rank" data-top-three={rank <= 3}>TOP {rank}</strong> : null}
          {!rank && isNew ? <strong>NEW</strong> : null}
          <em>{work.format}</em>
        </span>
        <span className="jyg-drama-card__heat"><Flame fill="currentColor" aria-hidden /> {work.heat}</span>
        <span className="jyg-drama-card__play"><Play fill="currentColor" aria-hidden /></span>
      </Link>
      <div className="jyg-drama-card__body">
        <h3>{work.title}</h3>
        <div className="jyg-drama-card__meta"><span>{work.genre}</span><span>{work.episodeLabel}</span></div>
        <Link href={href} aria-label={`進入《${work.title}》作品頁`}><Play fill="currentColor" aria-hidden /> 立即播放 <ArrowRight aria-hidden /></Link>
      </div>
    </article>
  );
}
