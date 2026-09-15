import { redirect } from "next/navigation";
import { getManagedContent } from "@/content/cms/java-cms-client";

export default async function EpisodePlayerPreview() {
  const items = await getManagedContent("work", "zh-Hant", 100);
  const item = items?.find(item => item.data.visible !== false);
  redirect(`/works/${encodeURIComponent(item?.slug ?? "night-and-you")}?episode=1#episodes`);
}
