import './globals.css';
import type { ReactNode } from 'react';
import { headers } from 'next/headers';

export const metadata = {
  title: 'AI MIDI Generator',
  description: 'Generate MIDI compositions with AI.'
};

export const viewport = {
  width: 'device-width',
  initialScale: 1
};

const themeInitScript = `
(() => {
  try {
    const storedTheme = window.localStorage.getItem('ai-midi-theme');
    const theme = storedTheme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
  } catch {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
`;

export default async function RootLayout({ children }: { children: ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script
          id="theme-init"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Outfit:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
