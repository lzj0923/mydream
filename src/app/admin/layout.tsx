import type { Metadata } from "next";
import type { ReactNode } from "react";

import "../(frontend)/prototype.css";
import "../(frontend)/navigation-hero.css";
import "../(frontend)/site-refinements.css";
import "./admin.css";

export const metadata: Metadata = {
  title: "內容管理中心｜MY DREAM",
  description: "MY DREAM 官方網站內容管理中心",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  );
}
