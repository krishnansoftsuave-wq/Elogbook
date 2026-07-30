import type { NextConfig } from "next";
import type { RemotePattern } from "next/dist/shared/lib/image-config";

const isDev = process.env.NODE_ENV === "development";

/**
 * The API origin is the only external host the app is allowed to talk to, so
 * the CSP `connect-src` is derived from it at build time rather than being
 * maintained as a second, drift-prone list.
 */
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const apiOrigin = (() => {
  if (!apiBaseUrl) return "";
  try {
    return new URL(apiBaseUrl).origin;
  } catch {
    throw new Error(
      `NEXT_PUBLIC_API_BASE_URL is not a valid absolute URL: "${apiBaseUrl}"`
    );
  }
})();

/** Hosts permitted to serve images through next/image. */
const imageHosts = (process.env.NEXT_PUBLIC_IMAGE_HOSTS ?? "")
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);

const remotePatterns: RemotePattern[] = imageHosts.map((hostname) => ({
  protocol: hostname === "localhost" ? "http" : "https",
  hostname,
  pathname: "/**",
}));

const connectSrc = ["'self'", apiOrigin, isDev ? "ws:" : ""]
  .filter(Boolean)
  .join(" ");

const imgSrc = ["'self'", "data:", "blob:", ...imageHosts].join(" ");

const contentSecurityPolicy = [
  "default-src 'self'",
  // Next.js injects inline bootstrap scripts; dev additionally needs eval for HMR.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src ${imgSrc}`,
  "font-src 'self' data:",
  `connect-src ${connectSrc}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // Preferred over X-Frame-Options: CSP-native and supports multiple origins.
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: { remotePatterns },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
