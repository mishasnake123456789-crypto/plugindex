import type { NextConfig } from "next";

const indexNowKey = process.env.INDEXNOW_KEY || "wpiindexnow7f91a9957194";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "ps.w.org", pathname: "/**" },
      { protocol: "https", hostname: "s.w.org", pathname: "/**" },
    ],
  },
  async rewrites() {
    return [
      {
        source: `/${indexNowKey}.txt`,
        destination: "/api/indexnow-key",
      },
    ];
  },
};

export default nextConfig;
