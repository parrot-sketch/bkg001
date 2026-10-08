/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { hostname: "images.pexels.com" },
      { hostname: "res.cloudinary.com" },
    ],
  },
  // Turbopack configuration (Next.js 16+)
  // Empty config silences the warning about webpack config
  turbopack: {},
  // Lets phones on the local network load dev assets (e.g. testing the QR intake form).
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
  // Webpack config for production builds (non-Turbopack)
  webpack: (config, { isServer }) => {
    // Fix for react-pdf and pdfjs-dist - disable canvas on client side
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        canvas: false,
      };
    }
    return config;
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
