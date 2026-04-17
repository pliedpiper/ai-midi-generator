/** @type {import('next').NextConfig} */
import { buildCspDirectives } from './lib/security/csp';

const isProduction = process.env.NODE_ENV === 'production';
const useCspReportOnly = process.env.CSP_REPORT_ONLY === 'true';
const cspDirectives = buildCspDirectives({ isProduction });

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
