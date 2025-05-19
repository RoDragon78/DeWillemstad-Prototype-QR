/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable experimental features that might cause middleware issues
  experimental: {
    // Ensure middleware is not used in any special way
    instrumentationHook: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Add any other necessary configuration
}

export default nextConfig
