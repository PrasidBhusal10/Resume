import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",    // required for Docker minimal image
  images: {
    remotePatterns: [
      { protocol: "http",  hostname: "localhost" },
      { protocol: "https", hostname: "**" },
    ],
  },
  experimental: {
    // Enables React 19 improvements
    reactCompiler: false,
  },
};

export default nextConfig;
