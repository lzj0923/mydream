import Image from "next/image";

import { brandTokens } from "@/data/brand-tokens";

export function BrandLogo({
  className,
  markOnly = false,
  priority = false,
}: {
  className?: string;
  markOnly?: boolean;
  priority?: boolean;
}) {
  const asset = markOnly
    ? { src: brandTokens.logo.mark, ...brandTokens.logo.markSize }
    : { src: brandTokens.logo.transparent, ...brandTokens.logo.transparentSize };

  return (
    <Image
      className={className}
      src={asset.src}
      alt={markOnly ? "MD" : "MD / MY DREAM"}
      width={asset.width}
      height={asset.height}
      priority={priority}
      loading={priority ? "eager" : undefined}
      unoptimized
    />
  );
}
