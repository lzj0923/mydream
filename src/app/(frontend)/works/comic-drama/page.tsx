import type { Metadata } from "next";
import { JygWorksIndex } from "@/components/prototype/jyg-works-index";
export const metadata: Metadata = { title: "AI漫劇" };
export default function ComicDramaPage() { return <JygWorksIndex type="comic-drama" />; }
