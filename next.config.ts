import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "theunitedstates.io",
        pathname: "/images/congress/**",
      },
    ],
  },
};

export default nextConfig;
