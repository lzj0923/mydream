"use client";

import { useEffect, useRef, useState } from "react";
import { formatVideoDuration, videoDurationSeconds } from "@/lib/creator-video/duration";

const durations = new Map<string, number>();

export function VideoDuration({ seconds, src }: { seconds?: unknown; src?: string }) {
  const target = useRef<HTMLSpanElement>(null);
  const [measured, setMeasured] = useState<{ src: string; seconds: number | null } | null>(null);
  const known = videoDurationSeconds(seconds);
  useEffect(() => {
    if (known !== null || !src || !target.current) return;
    let video: HTMLVideoElement | undefined, timer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false, started = false;
    const release = () => {
      clearTimeout(timer);
      if (video) { video.onloadedmetadata = null; video.onerror = null; video.removeAttribute("src"); video.load(); }
    };
    const finish = (value: number | null) => {
      if (disposed) return;
      if (value !== null) { if (durations.size >= 256) durations.clear(); durations.set(src, value); }
      setMeasured({ src, seconds: value }); release();
    };
    const start = () => {
      if (started) return;
      started = true;
      const cached = durations.get(src);
      if (cached !== undefined) { finish(cached); return; }
      video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => finish(videoDurationSeconds(video?.duration));
      video.onerror = () => finish(null);
      timer = setTimeout(() => finish(null), 15000);
      video.src = src;
    };
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); start(); }
    }, { rootMargin: "100px" });
    observer.observe(target.current);
    return () => { disposed = true; observer.disconnect(); release(); };
  }, [known, src]);
  const result = measured?.src === src ? measured : null;
  const label = formatVideoDuration(known ?? result?.seconds);
  return <span ref={target}>{label ?? (src && !result ? "讀取時長…" : "時長暫不可用")}</span>;
}
