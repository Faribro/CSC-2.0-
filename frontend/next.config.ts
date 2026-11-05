import type { NextConfig } from "next";

const rawBackend = process.env.BACKEND_URL || process.env.BACKEND_INTERNAL_URL || "http://localhost:8080";
let backendBase = rawBackend.replace(/^["']|["']$/g, "").trim();
if (!backendBase.startsWith("http://") && !backendBase.startsWith("https://")) {
  backendBase = `https://${backendBase}`;
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Same-origin BFF proxy forwarding to Spring Boot backend
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendBase}/api/:path*`,
      },
      {
        source: "/healthz",
        destination: `${backendBase}/healthz`,
      },
    ];
  },
};

export default nextConfig;
