import Link from "next/link";
import type { CSSProperties } from "react";
import {
  ArrowRight,
  Building2,
  Clock3,
  Mail,
  MapPin,
  Phone,
  Printer,
} from "lucide-react";

import { BrandLogo } from "@/components/brand/brand-logo";
import {
  defaultFooterSettings,
  safeFooterBackground,
  type FooterSettings,
} from "@/content/cms/footer-settings";

// Structured as a single view model so verified CMS values can replace the
// local placeholders without changing the Footer presentation component.
export function Footer({ settings = defaultFooterSettings }: { settings?: FooterSettings }) {
  const footerInformation = {
    contact: [
      { label: "Email", value: settings.email, icon: Mail },
      { label: "Phone", value: settings.phone, icon: Phone },
      { label: "Fax", value: settings.fax, icon: Printer },
    ],
    company: [
      { label: "地址", value: settings.address, icon: MapPin },
      { label: "統一編號", value: settings.companyNumber, icon: Building2 },
      { label: "服務時間", value: settings.serviceHours, icon: Clock3 },
    ],
  };
  const footerStyle = {
    "--footer-background": settings.backgroundColor,
    "--footer-background-image": `url(${JSON.stringify(safeFooterBackground(settings.backgroundUrl))})`,
    "--footer-title": settings.titleColor,
    "--footer-text": settings.textColor,
    "--footer-muted": settings.mutedColor,
    "--footer-accent": settings.accentColor,
    "--footer-brand-title-size": `${Math.min(48, Math.max(16, settings.brandTitleSize))}px`,
    "--footer-section-title-size": `${Math.min(32, Math.max(13, settings.sectionTitleSize))}px`,
    "--footer-detail-size": `${Math.min(20, Math.max(9, settings.detailTextSize))}px`,
    "--footer-background-position": settings.backgroundPosition,
  } as CSSProperties;

  return (
    <footer className="brand-footer" style={footerStyle}>
      <div className="brand-footer__space" aria-hidden />

      <div className="jyg-shell brand-footer__main">
        <section className="brand-footer__brand" aria-labelledby="footer-brand-heading">
          <Link href="/" className="brand-footer__logo-link" aria-label="MY DREAM 首頁">
            <BrandLogo className="brand-footer__logo" />
          </Link>
          <h2 id="footer-brand-heading">{settings.brandTitle}</h2>
          <p>{settings.brandSubtitle}</p>
        </section>

        <div className="brand-footer__information">
          <section className="brand-footer__information-column brand-footer__information-column--contact" aria-labelledby="footer-contact-heading">
            <header>
              <span><Mail aria-hidden /></span>
              <div>
                <h2 id="footer-contact-heading">{settings.contactTitle}</h2>
                <p>{settings.contactSubtitle}</p>
              </div>
            </header>
            <dl>
              {footerInformation.contact.map(({ label, value, icon: Icon }) => (
                <div key={label}>
                  <dt><Icon aria-hidden /></dt>
                  <dd><span>{label}</span><strong>{value}</strong></dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="brand-footer__information-column brand-footer__information-column--company" aria-labelledby="footer-company-heading">
            <header>
              <span><Building2 aria-hidden /></span>
              <div>
                <h2 id="footer-company-heading">{settings.companyTitle}</h2>
                <p>{settings.companySubtitle}</p>
              </div>
            </header>
            <dl>
              {footerInformation.company.map(({ label, value, icon: Icon }) => (
                <div key={label}>
                  <dt><Icon aria-hidden /></dt>
                  <dd><span>{label}</span><strong>{value}</strong></dd>
                </div>
              ))}
            </dl>
          </section>

          <nav className="brand-footer__legal-links" aria-label="服務協議與隱私權政策">
            <a href="https://share.the-drama-has-a-plot.com/service_agreement.html" target="_blank" rel="noopener noreferrer">
              <span>MY DREAM 服務使用協議</span>
              <ArrowRight aria-hidden />
            </a>
            <a href="https://share.the-drama-has-a-plot.com/privacy_policy.html" target="_blank" rel="noopener noreferrer">
              <span>MY DREAM 隱私權政策</span>
              <ArrowRight aria-hidden />
            </a>
          </nav>
        </div>
      </div>

      <div className="brand-footer__divider" aria-hidden><i /></div>

      <div className="brand-footer__bottom">
        <Link href="/" aria-label="MY DREAM 首頁">
          <BrandLogo className="brand-footer__bottom-logo" />
        </Link>
        <span aria-hidden />
        <p>{settings.copyright}</p>
      </div>

      <style>{`
        .brand-footer {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          color: var(--footer-title);
          background: var(--footer-background);
        }

        .brand-footer * { box-sizing: border-box; }
        .brand-footer__space {
          position: absolute;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          background: var(--footer-background-image) var(--footer-background-position) / cover no-repeat;
        }
        .brand-footer__space::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(90deg, rgba(2, 8, 23, .62) 0%, rgba(2, 8, 23, .28) 43%, rgba(2, 8, 23, .42) 100%),
            linear-gradient(180deg, rgba(2, 8, 23, .12) 0%, rgba(2, 8, 23, .22) 58%, rgba(2, 8, 23, .78) 100%);
        }
        .brand-footer__space::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(2, 8, 23, .18), transparent 24%, transparent 72%, rgba(2, 8, 23, .58));
        }

        .brand-footer__main {
          min-height: 320px;
          padding-top: 42px;
          padding-bottom: 34px;
          display: grid;
          grid-template-columns: minmax(270px, .72fr) minmax(620px, 1.58fr);
          align-items: stretch;
          gap: clamp(36px, 5vw, 72px);
        }
        .brand-footer__brand {
          min-width: 0;
          min-height: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        .brand-footer__logo-link {
          display: inline-flex;
          flex: 1 1 auto;
          min-height: 0;
          align-items: flex-start;
        }
        .brand-footer__logo {
          width: auto;
          height: 100%;
          max-width: 100%;
          max-height: 210px;
          object-fit: contain;
        }
        .brand-footer__brand h2 {
          margin: 12px 0 9px;
          font-size: clamp(18px, 2vw, var(--footer-brand-title-size));
          line-height: 1.38;
          letter-spacing: -.04em;
          font-weight: 650;
          white-space: pre-line;
        }
        .brand-footer__brand p {
          margin: 0;
          color: var(--footer-muted);
          font-size: 12px;
          letter-spacing: .035em;
        }
        .brand-footer__information {
          min-width: 0;
          height: 100%;
          padding: 23px 20px;
          border: 1px solid transparent;
          border-radius: 18px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          background:
            linear-gradient(145deg, rgba(6, 20, 42, .92), rgba(3, 10, 23, .94)) padding-box,
            linear-gradient(120deg, rgba(25, 191, 255, .82), rgba(78, 120, 193, .25) 45%, rgba(244, 183, 63, .8)) border-box;
          box-shadow: 0 30px 75px rgba(0, 0, 0, .35), inset 0 1px 0 rgba(255, 255, 255, .025);
          backdrop-filter: blur(18px);
        }
        .brand-footer__information-column { min-width: 0; padding: 0 21px; }
        .brand-footer__information-column + .brand-footer__information-column { border-left: 1px solid rgba(117, 151, 192, .24); }
        .brand-footer__information-column header { display: flex; align-items: center; gap: 13px; }
        .brand-footer__information-column header > span,
        .brand-footer__information-column dt {
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border-radius: 50%;
        }
        .brand-footer__information-column header > span {
          width: 40px;
          height: 40px;
          border: 1px solid currentColor;
          color: #22c9ff;
          background: rgba(25, 191, 255, .07);
          box-shadow: 0 0 24px rgba(25, 191, 255, .22), inset 0 0 18px rgba(25, 191, 255, .08);
        }
        .brand-footer__information-column--company header > span {
          color: #f4b73f;
          background: rgba(244, 183, 63, .07);
          box-shadow: 0 0 24px rgba(244, 183, 63, .2), inset 0 0 18px rgba(244, 183, 63, .07);
        }
        .brand-footer__information-column header svg { width: 19px; height: 19px; }
        .brand-footer__information-column header h2 { margin: 0; font-size: var(--footer-section-title-size); }
        .brand-footer__information-column header p { margin: 3px 0 0; color: #9fadc1; font-size: 9px; letter-spacing: .12em; }
        .brand-footer__information-column header::after {
          content: "";
          width: 38px;
          height: 1px;
          position: absolute;
          margin-top: 64px;
          background: linear-gradient(90deg, currentColor, transparent);
          color: #19bfff;
        }
        .brand-footer__information-column--company header::after { color: #f4b73f; }
        .brand-footer__information-column dl { margin: 23px 0 0; display: grid; gap: 12px; }
        .brand-footer__information-column dl > div { display: grid; grid-template-columns: 36px minmax(0, 1fr); align-items: center; gap: 10px; }
        .brand-footer__information-column dt {
          width: 36px;
          height: 36px;
          color: #24d2ff;
          background: radial-gradient(circle, rgba(25, 191, 255, .19), rgba(25, 191, 255, .04) 68%);
          box-shadow: inset 0 0 0 1px rgba(25, 191, 255, .4), 0 0 20px rgba(25, 191, 255, .12);
        }
        .brand-footer__information-column--company dt {
          color: #f6bf43;
          background: radial-gradient(circle, rgba(244, 183, 63, .18), rgba(244, 183, 63, .04) 68%);
          box-shadow: inset 0 0 0 1px rgba(244, 183, 63, .38), 0 0 20px rgba(244, 183, 63, .12);
        }
        .brand-footer__information-column dt svg { width: 17px; height: 17px; }
        .brand-footer__information-column dd { min-width: 0; margin: 0; display: grid; gap: 4px; }
        .brand-footer__information-column dd span { color: #90a1b5; font-size: 10px; }
        .brand-footer__information-column dd strong { color: var(--footer-text); font-size: var(--footer-detail-size); line-height: 1.4; font-weight: 550; overflow-wrap: anywhere; }
        .brand-footer__legal-links {
          grid-column: 1 / -1;
          margin: 22px 21px 0;
          padding-top: 18px;
          border-top: 1px solid rgba(117, 151, 192, .24);
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }
        .brand-footer__legal-links a {
          min-width: 0;
          min-height: 48px;
          padding: 0 22px;
          border: 1px solid rgba(199, 220, 240, .76);
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          color: var(--footer-text);
          background: linear-gradient(180deg, rgba(17, 42, 74, .92), rgba(5, 19, 39, .94));
          box-shadow: inset 0 0 0 1px rgba(25, 191, 255, .14), 0 0 18px rgba(25, 191, 255, .14);
          font-size: 13px;
          font-weight: 650;
          letter-spacing: .035em;
          text-align: center;
          text-decoration: none;
          transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease;
        }
        .brand-footer__legal-links a:hover {
          border-color: #40d4ff;
          box-shadow: inset 0 0 0 1px rgba(25, 191, 255, .25), 0 0 24px rgba(25, 191, 255, .26);
          transform: translateY(-1px);
        }
        .brand-footer__legal-links a:focus-visible { outline: 2px solid #f4c55a; outline-offset: 3px; }
        .brand-footer__legal-links svg { flex: 0 0 auto; width: 17px; height: 17px; }

        .brand-footer__divider { position: relative; height: 1px; background: linear-gradient(90deg, transparent, rgba(244, 183, 63, .7) 18%, rgba(244, 183, 63, .7) 82%, transparent); }
        .brand-footer__divider i { position: absolute; left: 50%; top: -3px; width: 7px; height: 7px; border-radius: 50%; background: #ffe07e; box-shadow: 0 0 17px #f4b73f; }
        .brand-footer__bottom { min-height: 76px; padding: 7px 20px 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
        .brand-footer__bottom a { display: inline-flex; }
        .brand-footer__bottom-logo { width: 44px; height: auto; object-fit: contain; }
        .brand-footer__bottom > span { width: 150px; max-width: 75vw; height: 1px; margin-top: 2px; background: radial-gradient(circle, #19bfff, rgba(244, 183, 63, .55) 38%, transparent 72%); box-shadow: 0 0 12px rgba(25, 191, 255, .2); }
        .brand-footer__bottom p { margin: 5px 0 0; color: var(--footer-muted); font-size: 8px; letter-spacing: .12em; }

        @media (max-width: 1120px) {
          .brand-footer__main { grid-template-columns: 1fr; gap: 34px; }
          .brand-footer__brand { max-width: 620px; }
        }

        @media (max-width: 700px) {
          .brand-footer__space { background-position: 57% center; }
          .brand-footer__main { min-height: 0; padding-top: 36px; padding-bottom: 28px; gap: 22px; }
          .brand-footer__brand { display: grid; grid-template-columns: 82px minmax(0, 1fr); column-gap: 16px; align-content: center; }
          .brand-footer__logo-link { flex: none; min-height: auto; grid-column: 1; grid-row: 1 / span 2; align-self: center; }
          .brand-footer__logo { width: 82px; height: auto; }
          .brand-footer__brand h2 { grid-column: 2; margin: 0; font-size: 20px; line-height: 1.36; overflow-wrap: anywhere; }
          .brand-footer__brand p { grid-column: 2; margin-top: 6px; font-size: 10px; overflow-wrap: anywhere; }
          .brand-footer__information { padding: 0 12px; grid-template-columns: 1fr; border-radius: 17px; }
          .brand-footer__information-column { padding: 16px 0 18px; }
          .brand-footer__information-column + .brand-footer__information-column { border-left: 0; border-top: 1px solid rgba(117, 151, 192, .22); }
          .brand-footer__information-column header { gap: 10px; }
          .brand-footer__information-column header > span { width: 32px; height: 32px; }
          .brand-footer__information-column header h2 { font-size: 16px; }
          .brand-footer__information-column header p { font-size: 8px; }
          .brand-footer__information-column header::after { width: 32px; margin-top: 52px; }
          .brand-footer__information-column dl { margin-top: 16px; gap: 8px; }
          .brand-footer__information-column dl > div { grid-template-columns: 30px minmax(0, 1fr); gap: 8px; }
          .brand-footer__information-column dt { width: 30px; height: 30px; }
          .brand-footer__information-column dt svg { width: 15px; height: 15px; }
          .brand-footer__information-column dd span { font-size: 9px; }
          .brand-footer__information-column dd strong { font-size: 11px; }
          .brand-footer__legal-links { margin: 0; padding: 16px 0 18px; grid-template-columns: 1fr; gap: 10px; }
          .brand-footer__legal-links a { min-height: 44px; padding-inline: 16px; font-size: 12px; }
          .brand-footer__bottom { min-height: 74px; padding-inline: 16px; }
          .brand-footer__bottom-logo { width: 42px; }
          .brand-footer__bottom p { font-size: 8px; line-height: 1.5; letter-spacing: .1em; }
        }
      `}</style>
    </footer>
  );
}
