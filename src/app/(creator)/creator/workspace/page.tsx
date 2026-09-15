import { CreatorWorkspace } from "@/components/creator-workspace/creator-workspace";
import { getManagedContent } from "@/content/cms/java-cms-client";

export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  const works = await getManagedContent("work", undefined, 500);
  return <CreatorWorkspace catalog={(works ?? []).map((work) => ({
    id: work.id, title: work.title, slug: work.slug, coverUrl: work.coverUrl ?? "",
    genre: String(work.data.genre ?? "原創短劇"), episodes: Number(work.data.episodeCount ?? 0),
    heat: Number(work.data.heat ?? 0),
  }))} />;
}
