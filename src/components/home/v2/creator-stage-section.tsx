import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import type { V2HomeModel } from "@/features/v2/home-model";
import { V2SectionHeading } from "./section-heading";

export function V2CreatorStageSection({ model }: { model: V2HomeModel }) {
  return (
    <section className="v2-section v2-creator" id="creator-stage">
      <div className="v2-section-shell">
        <V2SectionHeading index="03" eyebrow={model.creator.eyebrow} title={model.creator.title} description={model.creator.description} />
        <Link className="v2-text-link" href="/creator">認識創作者<ArrowUpRight size={16} aria-hidden /></Link>
      </div>
      <div className="v2-creator-grid">
        {model.creators.map((creator) => (
          <article className="v2-creator-card" key={creator.href} data-motion="reveal-card">
            <Link href={creator.href}>
              <div className="v2-creator-avatar"><Image src={creator.image.src} alt={creator.image.alt} fill sizes="120px" /></div>
              <div><small>{creator.meta}</small><h3>{creator.title}</h3><p>{creator.description}</p></div>
            </Link>
          </article>
        ))}
        <article className="v2-creator-join"><h3>讓你的故事被看見</h3><p>創作者功能與正式發布流程將於 APP 開放。</p><Link href="/creator">瞭解平台<ArrowUpRight size={15} /></Link></article>
      </div>
    </section>
  );
}
