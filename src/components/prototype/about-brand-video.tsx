"use client";

import { useRef, useState } from "react";
import { Play, X } from "lucide-react";

export function AboutBrandVideo({ label, videoUrl, bindCmsFields = true }: { label: string; videoUrl: string; bindCmsFields?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [source, setSource] = useState("");
  return <>
    <a href={videoUrl} data-cms-field={bindCmsFields ? "actionHref" : undefined} onClick={event => {
      event.preventDefault();
      setSource(event.currentTarget.getAttribute("href") || videoUrl);
      dialog.current?.showModal();
    }}><Play fill="currentColor" /><span data-cms-field={bindCmsFields ? "actionLabel" : undefined}>{label}</span></a>
    <dialog ref={dialog} className="jyg-brand-video" aria-label="認識劇有梗" onClose={() => setSource("")} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <button type="button" aria-label="關閉影片" onClick={() => dialog.current?.close()}><X /></button>
      {source && <video src={source} controls autoPlay playsInline />}
    </dialog>
  </>;
}
