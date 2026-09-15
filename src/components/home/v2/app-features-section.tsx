import Link from "next/link";
import { ArrowUpRight, Clapperboard, Gift, Grid3X3, ShieldCheck, Sparkles } from "lucide-react";

import type { V2HomeModel } from "@/features/v2/home-model";
import { V2SectionHeading } from "./section-heading";

const icons = { library: Grid3X3, hd: Clapperboard, creator: Sparkles, reward: Gift, shield: ShieldCheck } as const;

export function V2AppFeaturesSection({ model }: { model: V2HomeModel }) {
  return (
    <section className="v2-section v2-features" id="app-features">
      <div className="v2-section-shell">
        <V2SectionHeading index="02" eyebrow={model.features.eyebrow} title={model.features.title} description={model.features.description} />
        <Link className="v2-text-link" href="/download">瞭解 APP<ArrowUpRight size={16} aria-hidden /></Link>
      </div>
      <div className="v2-feature-grid">
        {model.features.items.map((feature, index) => {
          const Icon = icons[feature.icon];
          return <article key={feature.title} className="v2-feature-card" data-motion="reveal-card"><span className="v2-feature-icon"><Icon aria-hidden /></span><small>{String(index + 1).padStart(2, "0")}</small><h3>{feature.title}</h3><p>{feature.description}</p></article>;
        })}
      </div>
    </section>
  );
}
