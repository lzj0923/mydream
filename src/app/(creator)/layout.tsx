import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./workspace.css";
import "./reference-design.css";
import "./workspace-type-floor.css";
import "./workspace-polish.css";
import "./workspace-video-reference.css";

export const metadata: Metadata = {
  title: "創作者中心｜MY DREAM",
  description: "MY DREAM 創作者工作台，管理原創劇本、上傳視頻、提交作品並跟進審核。",
  robots: { index: false, follow: false },
};

export default function CreatorLayout({ children }: { children: ReactNode }) {
  return <html lang="zh-TW"><body>{children}</body></html>;
}
