import type { Metadata } from "next";

import "./globals.css";
import { ConsentBanner } from "@/components/consent/consent-banner";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import FrontendNotFound from "@/app/(frontend)/not-found";

export const metadata: Metadata = {
  title: "找不到頁面｜My Dream",
  robots: { index: false, follow: true },
};

export default function GlobalNotFound() {
  return (
    <html lang="zh-Hant">
      <body>
        <div className="site-shell">
          <a className="skip-link" href="#main-content">跳到主要內容</a>
          <Navbar />
          <main id="main-content"><FrontendNotFound /></main>
          <Footer />
          <ConsentBanner />
        </div>
      </body>
    </html>
  );
}
