import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';

// Strict CSP allowing Vercel Blob images, Clerk, and our own model routes.
const csp = [
  "default-src 'self'",
  // next/clerk need inline + eval in dev; keep eval out of prod.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://*.clerk.accounts.dev https://*.clerk.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com https://img.clerk.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://api.anthropic.com https://api.groq.com https://*.upstash.io",
  "frame-src 'self' https://*.clerk.accounts.dev https://*.clerk.com",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
      { protocol: 'https', hostname: 'img.clerk.com' },
    ],
  },
  async headers() {
    return [
      { source: '/(.*)', headers: securityHeaders },
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
};

export default nextConfig;
