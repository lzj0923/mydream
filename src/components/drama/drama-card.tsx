import Link from "next/link";
import type { Drama as ContentDrama } from "@/content/types";
import type { Drama as LegacyDrama } from "@/types/content";

type DramaCardItem = LegacyDrama | ContentDrama;
function isContentDrama(drama: DramaCardItem): drama is ContentDrama { return "poster" in drama; }

export function DramaCard({ drama }: { drama: DramaCardItem }) {
  const contentDrama = isContentDrama(drama);
  const cover = contentDrama ? `url(${drama.poster.src}) center / cover` : drama.cover;
  const category = contentDrama ? drama.categories.join("／") : drama.category;
  const status = contentDrama ? drama.availability : drama.status;
  return <Link href={`/drama/${drama.slug}`} className="drama-card"><div className="drama-cover" style={{ "--cover": cover } as React.CSSProperties}/><div className="drama-card__content"><small>{category} · {status}</small><h3>{drama.title}</h3></div></Link>;
}
