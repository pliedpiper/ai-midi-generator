import { describe, expect, it } from 'vitest';
import nextConfig from '@/next.config.js';

describe('next.config CSP', () => {
  it('allows Google Fonts stylesheet and font hosts used by layout', async () => {
    const headerEntries = await nextConfig.headers();
    const globalHeaders = headerEntries.find((entry) => entry.source === '/:path*');

    expect(globalHeaders).toBeDefined();
    const cspHeader = globalHeaders?.headers.find((header) => header.key === 'Content-Security-Policy');
    expect(cspHeader).toBeDefined();

    const csp = cspHeader?.value ?? '';
    expect(csp).toContain("style-src 'self' 'unsafe-inline' https://fonts.googleapis.com");
    expect(csp).toContain("font-src 'self' https://fonts.gstatic.com data:");
  });
});
