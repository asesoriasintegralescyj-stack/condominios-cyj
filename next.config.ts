import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Para Vercel, no usar standalone
  // output: "standalone",
  
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', '@tanstack/react-query'],
  },
};

export default nextConfig;
