import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  serverExternalPackages: ['pg'],
  // Bind to localhost only
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
    ];
  },
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  webpack: (config, { isServer, webpack }) => {
    if (isServer) {
      config.externals = Array.isArray(config.externals)
        ? [...config.externals, 'pg-native']
        : config.externals;
    }
    config.optimization = {
      ...config.optimization,
      minimize: true,
      nodeEnv: 'production',
    };
    config.parallelism = 1;
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
