import Image from "next/image";
import Link from "next/link";
import { Apple, Smartphone } from "lucide-react";

import type { V2HomeModel } from "@/features/v2/home-model";

function StoreButton({ label, href, ready, icon: Icon }: { label: string; href?: string; ready: boolean; icon: typeof Apple }) {
  const content = <><Icon aria-hidden /><span><small>{ready ? "立即下載" : "即將開放"}</small>{label}</span></>;
  return ready && href
    ? <a className="v2-store-button" href={href} target="_blank" rel="noreferrer">{content}</a>
    : <button className="v2-store-button" type="button" disabled>{content}</button>;
}

export function V2DownloadSection({ model }: { model: V2HomeModel }) {
  const iosReady = model.download.ios.availability === "available" && Boolean(model.download.ios.url);
  const googleHref = model.download.googlePlay.url;
  const googleReady = model.download.googlePlay.availability === "available" && Boolean(googleHref);
  const androidReady = model.download.android.availability === "available" && Boolean(model.download.android.url);
  return (
    <section className="v2-section v2-download" id="download">
      <div className="v2-download-inner">
        <div className="v2-download-device"><Image src={model.download.device.src} alt={model.download.device.alt} fill sizes="230px" /></div>
        <div><div className="v2-section-kicker"><span>05</span>{model.download.eyebrow}</div><h2>{model.download.title}</h2><p>{model.download.description}</p></div>
        <div className="v2-store-actions">
          <StoreButton label="App Store" href={model.download.ios.url} ready={iosReady} icon={Apple} />
          <StoreButton label="Google Play" href={googleHref} ready={googleReady} icon={Smartphone} />
          <StoreButton label="Android" href={model.download.android.url} ready={androidReady} icon={Smartphone} />
        </div>
        {model.download.qrCodeStatus === "available" && model.download.qrCode
          ? <div className="v2-download-qr"><Image src={model.download.qrCode.src} alt={model.download.qrCode.alt} fill sizes="82px" /></div>
          : <Link className="v2-download-more" href="/download">下載資訊</Link>}
      </div>
    </section>
  );
}
