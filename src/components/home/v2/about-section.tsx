import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import type { V2HomeModel } from "@/features/v2/home-model";

export function V2AboutSection({ model }: { model: V2HomeModel }) {
  return (
    <section className="v2-section v2-about" id="about">
      <Image className="v2-section-bg" src={model.about.image.src} alt="" fill sizes="100vw" />
      <div className="v2-section-scrim" />
      <div className="v2-about-inner" data-motion="reveal">
        <div className="v2-section-kicker"><span>07</span>{model.about.eyebrow}</div>
        <p className="v2-about-lead">STORIES<br /><strong>CONNECT.</strong></p>
        <div className="v2-about-copy">
          <h2>{model.about.title}</h2>
          <p>{model.about.description}</p>
          <Link className="v2-cta v2-cta--line" href="/about">認識 My Dream<ArrowUpRight size={17} aria-hidden /></Link>
        </div>
      </div>
    </section>
  );
}
