import { redirect } from "next/navigation";
import { getManagedContent } from "@/content/cms/java-cms-client";
import { prototypeOriginalVideos } from "@/data/jyg-video-prototype";

export default async function VideoPlayerPreview() {
  const items = await getManagedContent("original-video", "zh-Hant", 100);
  const item = items?.find(item => item.data.visible !== false);
  redirect(`/universe/videos/${encodeURIComponent(item?.slug ?? prototypeOriginalVideos[0].slug)}`);
}
