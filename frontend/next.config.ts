import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Rewrites for thin BFF forwarding to Spring Boot backend
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${process.env.BACKEND_INTERNAL_URL || "http://localhost:8080"}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
