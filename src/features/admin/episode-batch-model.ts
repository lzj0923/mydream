export type EpisodeBatchRecord = {
  type: string;
  relatedWorkId?: string;
  episodeNumber?: string | number;
  archived?: boolean;
};

function episodeNumberOf(item: EpisodeBatchRecord) {
  const value = Number(item.episodeNumber);
  return Number.isInteger(value) && value > 0 ? value : null;
}

/** Returns only the episode numbers that are currently shown in episode management. */
export function visibleEpisodeNumbers(records: EpisodeBatchRecord[], workId: string) {
  return records
    .filter((item) => item.type === "episode" && !item.archived && item.relatedWorkId === workId)
    .map(episodeNumberOf)
    .filter((value): value is number => value !== null);
}

export function nextVisibleEpisodeNumber(records: EpisodeBatchRecord[], workId: string) {
  return Math.max(0, ...visibleEpisodeNumbers(records, workId)) + 1;
}

/** Archived episodes have tombstoned slugs and no longer reserve their episode number. */
export function duplicateEpisodeNumbers(records: EpisodeBatchRecord[], workId: string, startEpisode: number, count: number) {
  const existing = new Set(
    records
      .filter((item) => item.type === "episode" && !item.archived && item.relatedWorkId === workId)
      .map(episodeNumberOf)
      .filter((value): value is number => value !== null),
  );
  return Array.from({ length: Math.max(0, count) }, (_, index) => Math.floor(startEpisode) + index)
    .filter((episode) => existing.has(episode));
}
