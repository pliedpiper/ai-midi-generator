import './globals.css';
import type { ReactNode } from 'react';
import Script from 'next/script';

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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
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
