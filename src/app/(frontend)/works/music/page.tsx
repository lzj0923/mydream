import type { Metadata } from "next";
import { JygWorksIndex } from "@/components/prototype/jyg-works-index";
export const metadata: Metadata = { title: "AI音樂" };
export default function MusicPage() { return <JygWorksIndex type="music" />; }
