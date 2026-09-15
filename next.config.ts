import type { NextConfig } from "next";
import { buildContentSecurityPolicy } from "./src/lib/security/csp";

const nextConfig: NextConfig = {
  devIndicators: false,
  experimental: {
    globalNotFound: true,
  },
  async redirects() {
    if (process.env.LOCAL_SHARED_CREATOR !== "true") return [];
    return ["/creator/:path*", "/admin/:path*"].map((source) => ({
      source,
      has: [{ type: "host" as const, value: "(?:localhost|127\\.0\\.0\\.1)(?::[0-9]+)?" }],
      destination: `https://official.mydream.tw${source}`,
      permanent: false,
    }));
  },
  async headers() {
    const usesHttps = process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://") ?? false;
    return [{ source: "/(.*)", headers: [
      { key: "Content-Security-Policy", value: buildContentSecurityPolicy() },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ...(process.env.NODE_ENV === "production" && usesHttps ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
    ] }];
  },
  async rewrites() {
    // The production PM2 deployment may omit CMS_API_URL because the CMS is
    // reverse-proxied on the same host. Keep media/API rewrites pointed at the
    // local CMS instead of generating a same-origin rewrite loop when the
    // variable is present but empty.
    const configuredCmsBase = process.env.CMS_API_URL?.trim();
    const cmsBase = (configuredCmsBase || "http://127.0.0.1:8080").replace(/\/$/, "");
    const siteKey = encodeURIComponent(process.env.CMS_SITE_KEY ?? "mydream");
    return [
      { source: "/admin-api/:path*", destination: `${cmsBase}/admin-api/:path*` },
      { source: "/public-api/:path*", destination: `${cmsBase}/public-api/:path*` },
      { source: "/media/:path*", destination: `${cmsBase}/media/:path*` },
      { source: "/cms-media/:path*", destination: `${cmsBase}/public-api/v1/sites/${siteKey}/assets/:path*` },
    ];
  },
};

export default nextConfig;
