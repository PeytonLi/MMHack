import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@mmhack/ai", "@mmhack/pricing", "@mmhack/shared", "@mmhack/vori"],
};

export default nextConfig;
