"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

import { consentStorageKey, parseStoredConsent, shouldLoadAnalytics, type ConsentLoadState } from "@/lib/consent";

export function ConsentBanner() {
  // The server and first client render are deliberately identical. Browser storage is read after hydration only.
  const [consent, setConsent] = useState<ConsentLoadState>("loading");
  const [hydrated, setHydrated] = useState(false);
  const analyticsEnabled = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true";
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID;

  useEffect(() => {
    // Defer browser storage access until after the first hydrated client paint.
    // This preserves the same loading markup produced by SSR and the first client render.
    const timer = window.setTimeout(() => {
      setConsent(parseStoredConsent(window.localStorage.getItem(consentStorageKey)));
      setHydrated(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const loadGa = shouldLoadAnalytics({ hydrated, consent, enabled: analyticsEnabled, providerId: gaId });
  const loadGtm = shouldLoadAnalytics({ hydrated, consent, enabled: analyticsEnabled, providerId: gtmId });

  return <>
    {loadGa ? <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId!)}`} strategy="afterInteractive" />
      <Script id="ga4-bootstrap" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)};window.gtag=gtag;gtag('js',new Date());gtag('config','${gaId!}');`}</Script>
    </> : null}
    {loadGtm ? <Script id="gtm-bootstrap" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];window.dataLayer.push({'gtm.start':new Date().getTime(),event:'gtm.js'});`}</Script> : null}
  </>;
}
