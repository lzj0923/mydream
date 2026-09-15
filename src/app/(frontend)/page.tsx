import { JygPrototypeHome } from "@/components/prototype/jyg-home";
import { getDramas, getHomePage } from "@/content/queries";
import { buildJygAllWorksModel, buildJygFeaturedWorksModel } from "@/features/jyg/home-featured-works-model";
import { buildJygHomeHeroModel } from "@/features/jyg/home-hero-model";
import { getManagedContent, getManagedPage } from "@/content/cms/java-cms-client";

export default async function HomePage() {
  const [home, managedPage, managedWorks] = await Promise.all([
    getHomePage(),
    getManagedPage("/"),
    getManagedContent("work", "zh-Hant", 200),
  ]);
  const requestedDramaIds = [...new Set(home.featuredDramaIds)];
  const dramas = requestedDramaIds.length
    ? await getDramas({ ids: requestedDramaIds, limit: 18 })
    : [];
  return (
    <JygPrototypeHome
      page={managedPage}
      hero={buildJygHomeHeroModel(home, managedPage)}
      featuredWorks={buildJygFeaturedWorksModel({ home, dramas, managedWorks })}
      discoveryWorks={buildJygAllWorksModel({ dramas, managedWorks })}
    />
  );
}
