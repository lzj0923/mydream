"use client";

import Image from "next/image";
import { Download, LockKeyhole, QrCode, X } from "lucide-react";
import { useState } from "react";

import { GOOGLE_PLAY_APP_URL } from "@/lib/app-links";

type EpisodeDownloadGateProps = {
  episodeLabel: string;
  episodeTitle: string;
  freeEpisodeCount: number;
  androidQrUrl?: string;
  iosQrUrl?: string;
};

export function EpisodeDownloadGate({ episodeLabel, episodeTitle, freeEpisodeCount, androidQrUrl, iosQrUrl }: EpisodeDownloadGateProps) {
  const [open, setOpen] = useState(false);
  const qrCodes = [
    {
      label: "Android",
      url: androidQrUrl,
      storeUrl: GOOGLE_PLAY_APP_URL,
    },
    {
      label: "iOS",
      url: iosQrUrl,
      storeUrl: GOOGLE_PLAY_APP_URL,
    },
  ].filter((item): item is { label: string; url: string; storeUrl: string } => Boolean(item.url));

  return (
    <>
      <button type="button" className="jyg-episode-card jyg-episode-card--locked" onClick={() => setOpen(true)}>
        <span>{episodeLabel}</span>
        <strong>{episodeTitle}</strong>
        <small>下載 APP 解鎖</small>
      </button>
      {open ? (
        <div className="jyg-episode-gate" role="presentation" onClick={() => setOpen(false)}>
          <div className="jyg-episode-gate__dialog" role="dialog" aria-modal="true" aria-labelledby="episode-gate-title" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="jyg-episode-gate__close" onClick={() => setOpen(false)} aria-label="關閉下載提示"><X aria-hidden /></button>
            <h2 id="episode-gate-title">下載 APP 解鎖全集</h2>
            <p>第 {freeEpisodeCount} 集後內容請在 MY DREAM APP 內繼續觀看。</p>
            <div className="jyg-episode-gate__episode"><LockKeyhole aria-hidden /><span>{episodeLabel} · {episodeTitle}</span></div>
            <div className="jyg-episode-gate__qr-grid">
              {qrCodes.length ? qrCodes.map((item) => <a className="jyg-episode-gate__store" key={item.label} href={item.storeUrl} target="_blank" rel="noopener noreferrer" aria-label={`${item.label} 下載，前往 Google Play`}><figure><Image src={item.url} alt={`MY DREAM ${item.label} 下載二維碼`} width={150} height={150} unoptimized /><figcaption className="jyg-episode-gate__store-button"><Download aria-hidden />{item.label} 下載<span aria-hidden>↗</span></figcaption></figure></a>) : <div className="jyg-episode-gate__qr-placeholder"><QrCode aria-hidden /><span>二維碼即將開放</span></div>}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
