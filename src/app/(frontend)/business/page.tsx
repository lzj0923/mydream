import type { Metadata } from "next";

import { JygBusinessCollaboration } from "@/components/prototype/jyg-business-collaboration";
import "./reference-design.css";

export const metadata: Metadata = {
  title: "IP授權／商業合作",
  description: "串聯原創 IP、品牌與全球市場，一起創造下一個娛樂新世界。",
};

export default function BusinessPage() {
  return <JygBusinessCollaboration referenceDesign />;
}
