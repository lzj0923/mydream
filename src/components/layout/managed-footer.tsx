"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { Footer } from "@/components/layout/footer";
import { resolveFooterSettings, type FooterSettings } from "@/content/cms/footer-settings";

type ShellResponse = {
  config?: {
    footer?: unknown;
  };
};

export function ManagedFooter({
  initialSettings,
  apiBase,
  siteKey,
}: {
  initialSettings: FooterSettings;
  apiBase: string;
  siteKey: string;
}) {
  const pathname = usePathname();
  const [settings, setSettings] = useState(initialSettings);

  useEffect(() => {
    let active = true;
    let requestSequence = 0;
    const base = apiBase.replace(/\/$/, "");

    const refresh = () => {
      const sequence = ++requestSequence;
      const query = new URLSearchParams({ refresh: String(Date.now()) });
      void fetch(`${base}/public-api/v1/sites/${encodeURIComponent(siteKey)}/shell?${query}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      })
        .then((response) => response.ok ? response.json() as Promise<ShellResponse> : null)
        .then((shell) => {
          if (active && sequence === requestSequence && shell) {
            setSettings(resolveFooterSettings(shell.config?.footer));
          }
        })
        .catch(() => undefined);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") refresh();
    };

    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      active = false;
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [apiBase, pathname, siteKey]);

  return <Footer settings={settings} />;
}
