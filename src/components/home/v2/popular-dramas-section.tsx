import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";

import type { V2HomeModel } from "@/features/v2/home-model";
import { V2SectionHeading } from "./section-heading";

export function V2PopularDramasSection({ model }: { model: V2HomeModel }) {
  return (
    <section className="v2-section v2-popular" id="popular-dramas" aria-labelledby="popular-dramas-title">
      <div className="v2-section-shell">
        <V2SectionHeading id="popular-dramas-title" index="01" eyebrow={model.popularDramas.eyebrow} title={model.popularDramas.title} description={model.popularDramas.description} />
        <Link className="v2-text-link" href="/explore">探索全部短劇<ArrowRight size={17} aria-hidden /></Link>
      </div>

      <div className="v2-drama-rail" data-motion="drama-rail">
        {model.dramas.map((drama, index) => (
          <article className="v2-drama-card" key={`${drama.title}-${index}`} data-motion="reveal-card">
            <Link href={drama.href} aria-label={`探索 ${drama.title}`}>
              <Image src={drama.image.src} alt={drama.image.alt} fill sizes="(max-width: 600px) 66vw, (max-width: 1000px) 34vw, 260px" />
              <div className="v2-drama-gradient" />
              <span className="v2-card-index">{String(index + 1).padStart(2, "0")}</span>
              <span className="v2-card-play"><Play size={17} fill="currentColor" aria-hidden /></span>
              <div className="v2-drama-copy">
                <h3>{drama.title}</h3>
                <p>{drama.meta}</p>
              </div>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
