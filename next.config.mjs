/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@react-pdf/renderer'],
    missingSuspenseWithCSRBailout: false,
  },
}

export default nextConfig
