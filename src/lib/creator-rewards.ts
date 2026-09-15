import { rewardPage, type Reward } from "./creator-analytics";

/** Only the authenticated App user's posted creator rewards are income. */
export async function loadCreatorRewards(ownerId: number, readPage: (page: number) => Promise<unknown>) {
  const rewards: Reward[] = [];
  const seen = new Set<string>();
  for (let page = 1; page <= 10; page++) {
    const data = rewardPage(await readPage(page), ownerId);
    for (const row of data.rewards) {
      if (!seen.has(row.id)) { seen.add(row.id); rewards.push(row); }
    }
    if (page * 100 >= data.total) return { rewards, rewardsComplete: true };
    if (data.count < 100) break;
  }
  return { rewards, rewardsComplete: false };
}
