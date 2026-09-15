import Image from "next/image";
import { mediaAssets, type ImageAsset } from "@/data/assets";

type Mode = "viewer" | "search" | "creator" | "rewards" | "profile" | "identity" | "dramaLibrary";
type Props = { mode?: Mode; className?: string; src?: string; alt?: string; includesDeviceFrame?: boolean; priority?: boolean };

function assetFor(mode: Mode): ImageAsset {
  if (mode === "search") return mediaAssets.app.search;
  if (mode === "creator" || mode === "identity") return mediaAssets.app.creator;
  if (mode === "rewards") return mediaAssets.app.rewards;
  if (mode === "profile") return mediaAssets.app.profile;
  if (mode === "dramaLibrary") return mediaAssets.app.dramaLibrary;
  return mediaAssets.app.home;
}

export function PhoneMockup({ mode = "viewer", className = "", src, alt, includesDeviceFrame, priority = false }: Props) {
  const asset = assetFor(mode);
  const imageSrc = src ?? asset.src;
  const imageAlt = alt ?? asset.alt;
  const hasFramedImage = includesDeviceFrame ?? asset.includesDeviceFrame ?? false;

  if (hasFramedImage) {
    return <figure className={`phone phone--provided-device ${className}`}>
      <Image src={imageSrc} alt={imageAlt} width={asset.width} height={asset.height} sizes="(max-width: 600px) 56vw, 300px" priority={priority}/>
    </figure>;
  }

  return <figure className={`phone phone--content-crop ${className}`}>
    <Image src={imageSrc} alt={imageAlt} width={asset.width} height={asset.height} sizes="(max-width: 600px) 48vw, 230px" priority={priority}/>
  </figure>;
}
