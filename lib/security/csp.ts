const cspReportUri = process.env.CSP_REPORT_URI?.trim();

type BuildCspOptions = {
  isProduction: boolean;
  nonce?: string;
};

const buildScriptSrc = ({ isProduction, nonce }: BuildCspOptions): string => {
  if (!isProduction) {
    return ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'blob:'].join(' ');
  }

  const sources = ["'self'", 'blob:'];

  if (nonce) {
    sources.push(`'nonce-${nonce}'`, "'strict-dynamic'");
  }

  return sources.join(' ');
};

export const buildCspDirectives = (options: BuildCspOptions): string =>
  [
    "default-src 'self'",
    `script-src ${buildScriptSrc(options)}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob:",
    "font-src 'self' https://fonts.gstatic.com data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    ...(cspReportUri ? [`report-uri ${cspReportUri}`] : []),
  ].join('; ');
