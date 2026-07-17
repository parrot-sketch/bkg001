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
  // ── Security Headers ──────────────────────────────────────────────────────
  // Applied to every route. Shrinks the XSS / clickjacking / MIME-sniffing
  // surface and enforces HTTPS.
  async headers() {
    const csp = [
      "default-src 'self'",
      // 'unsafe-inline' is required for Next.js App Router's streamed RSC
      // payload scripts and a few print-page inline scripts. The bigger XSS win
      // here is connect-src 'self' (blocks exfiltration to attacker servers) and
      // blocking external script origins. For stronger coverage, migrate to a
      // nonce-based CSP via a Next.js middleware (e.g. next-safe).
      "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; ');

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          {
            key: 'Permissions-Policy',
            value:
              'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
