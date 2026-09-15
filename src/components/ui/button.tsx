import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function Button({ href, children, variant = "gold", disabled = false }: { href?: string; children: React.ReactNode; variant?: "gold" | "ghost"; disabled?: boolean }) {
  const content = <>{children}<ArrowUpRight size={17} aria-hidden /></>;
  if (disabled) return <button type="button" className={`button button--${variant}`} disabled aria-disabled="true">{content}</button>;
  if (!href) return null;
  return <Link className={`button button--${variant}`} href={href}>{content}</Link>;
}
