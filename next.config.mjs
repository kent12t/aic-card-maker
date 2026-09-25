const isDev = process.env.NODE_ENV !== "production";

// Switch to "Content-Security-Policy" once the report-only run shows no violations in the console.
const CSP_HEADER = "Content-Security-Policy-Report-Only";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convexSiteUrl =
  process.env.NEXT_PUBLIC_CONVEX_SITE_URL ?? convexUrl?.replace(/\.cloud$/, ".site");

const originOf = (url) => (url ? new URL(url).origin : "");
const convexOrigin = originOf(convexUrl);
const convexSocket = convexOrigin.replace(/^http/, "ws");
const convexSiteOrigin = originOf(convexSiteUrl);

const csp = [
  "default-src 'self'",
  // Next.js injects inline bootstrap scripts; dev mode also needs eval for fast refresh.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // blob: for stickers uploaded in the editor; Convex origin for the display wall images.
  `img-src 'self' blob: data: ${convexOrigin}`,
  "font-src 'self'",
  `connect-src 'self' ${convexOrigin} ${convexSocket} ${convexSiteOrigin}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: CSP_HEADER, value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
