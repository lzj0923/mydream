import Link from "next/link";
import { ArrowUpRight, CalendarCheck, PlayCircle, UserPlus } from "lucide-react";

import type { V2HomeModel } from "@/features/v2/home-model";
import { V2SectionHeading } from "./section-heading";

const icons = { "check-in": CalendarCheck, watch: PlayCircle, invite: UserPlus } as const;

export function V2RewardsSection({ model }: { model: V2HomeModel }) {
  return (
    <section className="v2-section v2-rewards" id="rewards">
      <div className="v2-rewards-inner">
        <V2SectionHeading index="04" eyebrow={model.rewards.eyebrow} title={model.rewards.title} description={model.rewards.description} />
        <div className="v2-reward-flow">
          {model.rewards.cards.map((card, index) => {
            const Icon = icons[card.icon];
            return <article key={card.title} data-motion="reveal-card"><span><Icon aria-hidden /></span><small>{String(index + 1).padStart(2, "0")}</small><h3>{card.title}</h3><p>{card.description}</p><div className="v2-task-status"><b>{card.statusLabel}</b><em>{card.actionLabel}</em></div></article>;
          })}
        </div>
        <div className="v2-reward-footer"><p>{model.rewards.note}</p><Link className="v2-text-link" href="/download">查看 APP 資訊<ArrowUpRight size={15} /></Link></div>
      </div>
    </section>
  );
}
