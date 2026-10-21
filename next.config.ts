import type { NextConfig } from "next";

const privateHeaders = [
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const nextConfig: NextConfig = {
  // Prompt files are read with fs at runtime; ship them with the AI routes.
  outputFileTracingIncludes: {
    "/api/e/[token]/ai": ["./prompts/**"],
    "/api/e/[token]/alerts": ["./prompts/**"],
    "/api/e/[token]/summary": ["./prompts/**"],
  },
  async headers() {
    return [
      { source: "/e/:path*", headers: privateHeaders },
      { source: "/api/e/:path*", headers: privateHeaders },
    ];
  },
};

export default nextConfig;
