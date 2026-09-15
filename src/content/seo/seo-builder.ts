import type { Metadata } from "next";
import type { SeoFields, Site } from "@/content/types";

type SeoInput = Omit<SeoFields, "noIndex"> & { noIndex?: boolean; path?: string; type?: "website" | "article" };

function absoluteUrl(site: Site, path?: string): string {
  return new URL(path || "/", site.siteUrl).toString();
}

/** One metadata builder keeps canonical, Open Graph, and robots rules consistent. */
export function buildSeoMetadata(site: Site, input: SeoInput = {}): Metadata {
  const title = input.title || site.defaultSeo.title || site.name;
  const description = input.description || site.defaultSeo.description || "";
  const canonicalPath = input.canonicalPath || input.path || site.defaultSeo.canonicalPath || "/";
  const image = input.ogImage || site.defaultSeo.ogImage;
  const canonical = input.canonicalURL || absoluteUrl(site, canonicalPath);

  return {
    title,
    description,
    keywords: input.keywords,
    alternates: { canonical },
    robots: input.noIndex ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      type: input.type || "website",
      locale: site.locale.replace("-", "_"),
      siteName: site.name,
      title,
      description,
      url: canonical,
      images: image ? [{ url: absoluteUrl(site, image.src), alt: image.alt, width: image.width, height: image.height }] : undefined,
    },
    twitter: { card: "summary_large_image", title, description, images: image ? [absoluteUrl(site, image.src)] : undefined },
  };
}

export function buildOrganizationJsonLd(site: Site): Record<string, unknown> {
  return { "@context": "https://schema.org", "@type": "Organization", name: site.name, url: site.siteUrl };
}
