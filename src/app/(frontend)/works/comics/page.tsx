import type { Metadata } from "next";
import { JygWorksIndex } from "@/components/prototype/jyg-works-index";
export const metadata: Metadata = { title: "AI漫畫" };
export default function ComicsPage() { return <JygWorksIndex type="comics" />; }
