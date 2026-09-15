export type FooterSettings = {
  brandTitle: string;
  brandSubtitle: string;
  ctaLabel: string;
  ctaHref: string;
  contactTitle: string;
  contactSubtitle: string;
  email: string;
  phone: string;
  fax: string;
  companyTitle: string;
  companySubtitle: string;
  address: string;
  companyNumber: string;
  serviceHours: string;
  copyright: string;
  backgroundUrl: string;
  backgroundMediaId: string;
  backgroundColor: string;
  titleColor: string;
  textColor: string;
  mutedColor: string;
  accentColor: string;
  brandTitleSize: number;
  sectionTitleSize: number;
  detailTextSize: number;
  backgroundPosition: string;
};

export const defaultFooterSettings: FooterSettings = {
  brandTitle: "讓 AI 創造故事，\n讓世界愛上原創角色。",
  brandSubtitle: "AI Original Entertainment Platform",
  ctaLabel: "進入 AI 宇宙",
  ctaHref: "/universe",
  contactTitle: "聯絡我們",
  contactSubtitle: "CONTACT US",
  email: "jyg0958157548@gmail.com",
  phone: "(02)2701-2891",
  fax: "970872362",
  companyTitle: "公司資訊",
  companySubtitle: "COMPANY INFO",
  address: "台北市大安區信義路4段296號15樓",
  companyNumber: "60560425",
  serviceHours: "AM 8:00 - PM 18:00",
  copyright: "© 2026 MY DREAM. ALL RIGHTS RESERVED.",
  backgroundUrl: "/assets/jyg/footer-global-network-map-hd.png",
  backgroundMediaId: "",
  backgroundColor: "#020817",
  titleColor: "#f5f8fc",
  textColor: "#dce6f0",
  mutedColor: "#9eafc3",
  accentColor: "#f4c55a",
  brandTitleSize: 28,
  sectionTitleSize: 18,
  detailTextSize: 12,
  backgroundPosition: "center 54%",
};

export function resolveFooterSettings(value: unknown): FooterSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ...defaultFooterSettings };
  const source = value as Record<string, unknown>;
  return Object.fromEntries(Object.entries(defaultFooterSettings).map(([key, fallback]) => {
    const candidate = source[key];
    return [key, typeof candidate === typeof fallback ? candidate : fallback];
  })) as FooterSettings;
}

export function safeFooterHref(value: string) {
  const href = value.trim();
  if (/^\/(?!\/)[^\\\r\n]*$/.test(href) || /^https?:\/\/[^\s]+$/i.test(href)) return href;
  return defaultFooterSettings.ctaHref;
}

export function safeFooterBackground(value: string) {
  const url = value.trim();
  // This bundled image must not depend on the CMS legacy-asset proxy. Existing
  // saved configs still use its old alias; keep user-uploaded media URLs intact.
  if (url === "/cms-media/assets/jyg/footer-global-network-map-hd.png") return defaultFooterSettings.backgroundUrl;
  if (/^\/(?!\/)[^\\\r\n]*$/.test(url) || /^https?:\/\/[^\s]+$/i.test(url)) return url;
  return defaultFooterSettings.backgroundUrl;
}
