import type { Metadata } from "next";
import { JygWorksIndex } from "@/components/prototype/jyg-works-index";
export const metadata: Metadata = { title: "AI動畫" };
export default function AnimationPage() { return <JygWorksIndex type="animation" />; }
