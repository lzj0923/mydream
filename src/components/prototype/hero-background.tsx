import type { CSSProperties } from "react";
import Image from "next/image";

export type HeroBackgroundTheme =
  | "home"
  | "universe"
  | "pricing"
  | "news"
  | "about"
  | "contact";

type HeroBackgroundProps = {
  image: string;
  video?: string;
  alt: string;
  theme: HeroBackgroundTheme;
  position: string;
  mobilePosition: string;
  priority?: boolean;
};

type HeroBackgroundStyle = CSSProperties & {
  "--jyg-hero-position": string;
  "--jyg-hero-position-mobile": string;
};

export function HeroBackground({
  image,
  video,
  alt,
  theme,
  position,
  mobilePosition,
  priority = false,
}: HeroBackgroundProps) {
  const style: HeroBackgroundStyle = {
    "--jyg-hero-position": position,
    "--jyg-hero-position-mobile": mobilePosition,
  };

  return (
    <div
      className={`jyg-global-hero-background jyg-global-hero-background--${theme}`}
      style={style}
      aria-hidden={alt ? undefined : true}
    >
      <Image
        className="jyg-global-hero-background__image"
        data-cms-field="backgroundUrl"
        src={image}
        alt={alt}
        fill
        priority={priority}
        sizes="100vw"
        unoptimized
      />
      {video ? (
        <video
          className="jyg-global-hero-background__video"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={image}
          aria-hidden="true"
        >
          <source src={video} type="video/mp4" />
        </video>
      ) : null}
      <span className="jyg-global-hero-background__overlay" aria-hidden />
    </div>
  );
}
