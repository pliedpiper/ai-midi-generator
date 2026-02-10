/** @type {import('next').NextConfig} */
const isProduction = process.env.NODE_ENV === 'production';
const useCspReportOnly = process.env.CSP_REPORT_ONLY === 'true';
const cspReportUri = process.env.CSP_REPORT_URI?.trim();

const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  ...(isProduction ? [] : ["'unsafe-eval'"]),
  'blob:'
].join(' ');

const cspDirectives = [
  "default-src 'self'",
  `script-src ${scriptSrc}`, // Next.js + Tone.js AudioWorklet
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // Tailwind + Google Fonts stylesheet
  "img-src 'self' data: blob:",
  "font-src 'self' https://fonts.gstatic.com data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "media-src 'self' blob:", // For audio playback
  "worker-src 'self' blob:", // Tone.js Web Workers
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  ...(cspReportUri ? [`report-uri ${cspReportUri}`] : [])
].join('; ');

const cspHeaderKey = useCspReportOnly
  ? 'Content-Security-Policy-Report-Only'
  : 'Content-Security-Policy';

const nextConfig = {
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: cspHeaderKey,
            value: cspDirectives
          }
        ]
      }
    ];
  }
};

export default nextConfig;
