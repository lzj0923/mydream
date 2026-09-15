import Link from "next/link";
import { ArrowRight, Clapperboard } from "lucide-react";

export function V2StatusPanel({
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="v2-status-panel" role="status" data-motion="reveal">
      <Clapperboard aria-hidden />
      <h2>{title}</h2>
      <p>{description}</p>
      {action && <Link href={action.href}>{action.label}<ArrowRight size={16} aria-hidden /></Link>}
    </div>
  );
}
