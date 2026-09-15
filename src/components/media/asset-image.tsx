import Image from "next/image";

type Asset = { src: string; alt: string; available: boolean };
export function AssetImage({ asset, className, fallback }: { asset: Asset; className?: string; fallback: React.ReactNode }) {
  if (!asset.available) return <>{fallback}</>;
  return <Image className={className} src={asset.src} alt={asset.alt} fill sizes="(max-width: 768px) 70vw, 340px" />;
}
