/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable experimental features that might cause middleware issues
  experimental: {
    // Ensure middleware is not used in any special way
    instrumentationHook: false,
  },
  // Transpile specific modules if needed
  transpilePackages: ["@hookform/resolvers"],
  // Ignore ESLint errors during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Ignore TypeScript errors during build
  typescript: {
    ignoreBuildErrors: true,
  },
  // Disable image optimization for simplicity
  images: {
    unoptimized: true,
  },
}

export default nextConfig
