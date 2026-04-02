import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "bioguide.congress.gov",
        pathname: "/bioguide/photo/**",
      },
    ],
  },
};

export default nextConfig;
