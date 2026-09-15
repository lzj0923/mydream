"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";

export function ShareAction({ title, label = "分享" }: { title: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const payload = { title, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(payload);
      else {
        await navigator.clipboard.writeText(payload.url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      // Cancellation leaves the current page untouched.
    }
  };

  return <button className="v2-share-action" type="button" onClick={share} aria-live="polite">
    {copied ? <Check size={16} aria-hidden /> : <Share2 size={16} aria-hidden />}
    {copied ? "連結已複製" : label}
  </button>;
}
