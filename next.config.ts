import { dirname } from "path";
import { fileURLToPath } from "url";
import type { NextConfig } from "next";

const __dirname = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: __dirname,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
  async redirects() {
    return [
      { source: "/techlab", destination: "/articles", permanent: true },
      { source: "/daily", destination: "/signal", permanent: true },
      { source: "/:locale/techlab", destination: "/:locale/articles", permanent: true },
      { source: "/:locale/daily", destination: "/:locale/signal", permanent: true },
    ];
  },
};

export default nextConfig;
