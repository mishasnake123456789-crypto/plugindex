import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "ps.w.org", pathname: "/**" },
      { protocol: "https", hostname: "s.w.org", pathname: "/**" },
    ],
  },
};

export default nextConfig;
