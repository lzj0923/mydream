export type PublicNavItem = { id: string; label: string; href: string; target?: "_self" | "_blank" };

const publicPages = [
  ["/universe", "AI創作中心"], ["/tasks", "價目表"], ["/business", "IP授權"],
  ["/about", "關於我們"], ["/news", "最新消息"], ["/contact", "聯絡我們"],
] as const;

export function publicNavigation(items: readonly PublicNavItem[]): PublicNavItem[] {
  return publicPages.map(([href, label]) => ({
    ...items.find(item => item.href === href), id: href, href, label,
  }));
}
