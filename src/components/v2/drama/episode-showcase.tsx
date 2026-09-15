import { LockKeyhole } from "lucide-react";

import { episodePreviewNumbers } from "@/features/v2/internal-model";

export function EpisodeShowcase({ episodeCount }: { episodeCount?: number }) {
  const episodes = episodePreviewNumbers(episodeCount);
  return (
    <div className="v2-episode-showcase" data-motion="reveal">
      <div className="v2-episode-note">
        <div><strong>劇集列表</strong><span>介面視覺示意 · 完整播放服務以 APP 公告為準</span></div>
      </div>
      {episodes.length > 0 ? (
        <div className="v2-episode-grid" aria-label="選集視覺示意">
          {episodes.map((episode) => <button type="button" disabled key={episode}>{String(episode).padStart(2, "0")}<LockKeyhole size={11} aria-hidden /></button>)}
        </div>
      ) : <p className="v2-page-note">CMS 尚未提供集數資料，因此不顯示虛構選集。</p>}
      {episodeCount && episodeCount > episodes.length ? <p className="v2-page-note">共 {episodeCount} 集，此處預覽前 {episodes.length} 集。</p> : null}
    </div>
  );
}
