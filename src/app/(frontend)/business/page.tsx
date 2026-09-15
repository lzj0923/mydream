import type { Metadata } from "next";

import { JygBusinessCollaboration } from "@/components/prototype/jyg-business-collaboration";

export const metadata: Metadata = {
  title: "商業合作／聯絡我們",
  description: "串聯原創 IP、品牌與全球市場，一起創造下一個娛樂新世界。",
};

export default function BusinessPage() {
  return <JygBusinessCollaboration />;
}
