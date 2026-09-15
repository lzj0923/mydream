"use client";
import { useEffect, useRef, useState } from "react";
import { shouldAttachVideoSource, shouldAutoplayVideo } from "@/lib/motion/runtime";

export function VideoMedia({ src, poster, alt, active = true, autoPlay = true, loop = false, className = "" }: { src: string; poster: string; alt: string; active?: boolean; autoPlay?: boolean; loop?: boolean; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null); const [visible, setVisible] = useState(false); const [reduced, setReduced] = useState(false);
  useEffect(() => { const media = window.matchMedia("(prefers-reduced-motion: reduce)"); const sync = () => setReduced(media.matches); sync(); media.addEventListener("change", sync); const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "160px" }); if (ref.current) observer.observe(ref.current); return () => { media.removeEventListener("change", sync); observer.disconnect(); }; }, []);
  useEffect(() => { const video = ref.current; if (!video) return; if (shouldAutoplayVideo({ visible, reducedMotion: reduced, active, autoPlay })) void video.play().catch(() => undefined); else video.pause(); }, [visible, active, autoPlay, reduced]);
  const attachSource = shouldAttachVideoSource({ visible, reducedMotion: reduced });
  return <video ref={ref} className={className} aria-label={alt} muted playsInline loop={loop} poster={poster} preload={attachSource ? "metadata" : "none"} src={attachSource ? src : undefined}/>;
}
