import Image from "next/image";
import Link from "next/link";
import { Heart, MessageCircle, Play, Share2 } from "lucide-react";

import type { V2HomeModel } from "@/features/v2/home-model";
import { V2SectionHeading } from "./section-heading";

export function V2ImmersiveFeedSection({ model }: { model: V2HomeModel }) {
  const feedItems = model.dramas.slice(0, 3);

  return (
    <section className="v2-section v2-feed-section" id="immersive-feed">
      <div className="v2-feed-copy">
        <V2SectionHeading index="02" eyebrow={model.immersive.eyebrow} title={model.immersive.title} description={model.immersive.description} />
        <div className="v2-feed-metrics" data-motion="reveal">
          <span><b>SWIPE</b>直覺探索</span>
          <span><b>SAVE</b>收藏片刻</span>
          <span><b>SHARE</b>分享共鳴</span>
        </div>
        <Link className="v2-cta v2-cta--line" href="/explore">打開內容世界</Link>
      </div>

      <div className="v2-feed-stage" data-motion="feed-stage">
        {feedItems.map((item, index) => (
          <div className={`v2-feed-phone v2-feed-phone--${index + 1}`} key={item.title}>
            <Image src={item.image.src} alt={index === 1 ? item.image.alt : ""} fill sizes="(max-width: 600px) 58vw, 260px" />
            <div className="v2-feed-overlay" />
            {index === 1 && (
              <>
                <span className="v2-feed-demo-icon" aria-hidden><Play fill="currentColor" /></span>
                <div className="v2-feed-social" aria-hidden><Heart /><MessageCircle /><Share2 /></div>
                <div className="v2-feed-title"><small>{item.isDemo ? "視覺示意" : "SHORT DRAMA"}</small><b>{item.title}</b></div>
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
