import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Skip TypeScript checking during build
  typescript: {
    ignoreBuildErrors: true,
  },
  // Skip ESLint during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Optimize for production
  swcMinify: true,
  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
    // Ensure server can import native Node packages like 'pg'
    serverComponentsExternalPackages: ['pg'],
  },
  // Explicitly mark server externals for Node.js runtime
  serverExternalPackages: ['pg'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Prevent optional native deps from breaking builds
      config.externals = Array.isArray(config.externals)
        ? [...config.externals, 'pg-native']
        : config.externals;
    }
    return config;
  },
  // Add redirects for Vercel deployment
  async redirects() {
    return [
      {
        source: '/',
        destination: '/auth/login',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
