import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // optimizePackageImports: Next.js reescribe los imports de barril a subpaths
    // directos en tiempo de build, preservando tipos y eliminando código sin uso.
    optimizePackageImports: ["aws-amplify", "@aws-amplify/ui-react", "lucide-react"],
  },
};

export default nextConfig;
