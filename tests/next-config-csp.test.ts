import { afterEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

const loadNextConfig = async () => {
  vi.resetModules();
  const configModule = await import('../next.config.js');
  return configModule.default;
};

const getGlobalHeaders = async () => {
  const nextConfig = await loadNextConfig();
  const headerEntries = await nextConfig.headers();
  return headerEntries.find((entry) => entry.source === '/:path*');
};

afterEach(() => {
  process.env = { ...originalEnv };
  vi.resetModules();
});

describe('next.config CSP', () => {
  it('includes Google Fonts hosts and keeps unsafe-eval outside production', async () => {
    process.env = {
      ...process.env,
      NODE_ENV: 'test'
    };
    delete process.env.CSP_REPORT_ONLY;

    const globalHeaders = await getGlobalHeaders();
    expect(globalHeaders).toBeDefined();

    const cspHeader = globalHeaders?.headers.find((header) => header.key === 'Content-Security-Policy');
    expect(cspHeader).toBeDefined();

    const csp = cspHeader?.value ?? '';
    expect(csp).toContain("style-src 'self' 'unsafe-inline' https://fonts.googleapis.com");
    expect(csp).toContain("font-src 'self' https://fonts.gstatic.com data:");
    expect(csp).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:");
    expect(csp).toContain("worker-src 'self' blob:");
  });

  it('drops unsafe-eval in production CSP while preserving blob allowances', async () => {
    process.env = {
      ...process.env,
      NODE_ENV: 'production'
    };
    delete process.env.CSP_REPORT_ONLY;

    const globalHeaders = await getGlobalHeaders();
    expect(globalHeaders).toBeDefined();

    const cspHeader = globalHeaders?.headers.find((header) => header.key === 'Content-Security-Policy');
    expect(cspHeader).toBeDefined();

    const csp = cspHeader?.value ?? '';
    expect(csp).toContain("script-src 'self' 'unsafe-inline' blob:");
    expect(csp).not.toContain("'unsafe-eval'");
    expect(csp).toContain("worker-src 'self' blob:");
  });

  it('switches to report-only mode when CSP_REPORT_ONLY=true', async () => {
    process.env = {
      ...process.env,
      NODE_ENV: 'production',
      CSP_REPORT_ONLY: 'true'
    };

    const globalHeaders = await getGlobalHeaders();
    expect(globalHeaders).toBeDefined();

    const reportOnlyHeader = globalHeaders?.headers.find(
      (header) => header.key === 'Content-Security-Policy-Report-Only'
    );
    expect(reportOnlyHeader).toBeDefined();

    const enforcedHeader = globalHeaders?.headers.find(
      (header) => header.key === 'Content-Security-Policy'
    );
    expect(enforcedHeader).toBeUndefined();
  });
});
