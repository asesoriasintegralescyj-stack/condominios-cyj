import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Para Vercel, no usar standalone
  // output: "standalone",
  
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  
  // googleapis es muy pesado (~30MB), excluirlo del bundle del server
  serverExternalPackages: ['googleapis'],
  
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', '@tanstack/react-query'],
  },
};

export default nextConfig;
