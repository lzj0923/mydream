import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";

import type { Drama } from "@/content/types";

const availabilityLabel = {
  upcoming: "即將推出",
  available: "內容已上架",
  ended: "已完結",
} as const;

export function V2DramaCard({ drama, priority = false }: { drama: Drama; priority?: boolean }) {
  return (
    <article className="v2-library-card">
      <Link href={`/drama/${drama.slug}`} aria-label={`查看《${drama.title}》詳情`}>
        <div className="v2-library-card__image">
          <Image src={drama.poster.src} alt={drama.poster.alt} fill sizes="(max-width: 600px) 72vw, (max-width: 1000px) 33vw, 22vw" priority={priority} />
          <div className="v2-library-card__scrim" />
          {drama.featured && <span className="v2-library-card__badge">精選</span>}
          <span className="v2-library-card__play"><Play size={13} fill="currentColor" aria-hidden /></span>
        </div>
        <div className="v2-library-card__copy">
          <small>{drama.categories.join("／") || "短劇"}</small>
          <h3 className="v2-card-title">{drama.title}</h3>
          <div className="v2-library-card__meta">
            <span>{availabilityLabel[drama.availability]}</span>
            {drama.episodes && <span>{drama.episodes} 集</span>}
          </div>
        </div>
      </Link>
    </article>
  );
}
