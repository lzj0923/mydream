import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://mydream.example.com";
  const production = process.env.NODE_ENV === "production";
  return {
    rules: production
      ? [{ userAgent: "*", allow: "/" }]
      : [{ userAgent: "*", disallow: "/" }],
    sitemap: `${base}/sitemap.xml`,
  };
}
