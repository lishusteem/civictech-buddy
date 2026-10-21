import type { NextConfig } from "next";

const privateHeaders = [
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/e/:path*", headers: privateHeaders },
      { source: "/api/e/:path*", headers: privateHeaders },
    ];
  },
};

export default nextConfig;
