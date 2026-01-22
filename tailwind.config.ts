import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';
import lineClamp from '@tailwindcss/line-clamp';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './utils/**/*.{js,ts,jsx,tsx,mdx}',
    './services/**/*.{js,ts,jsx,tsx,mdx}',
    './App.tsx'
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          900: '#121212',
          800: '#1a1a1a',
          700: '#242424',
          600: '#2e2e2e',
          500: '#383838'
        },
        text: {
          primary: '#e5e5e5',
          secondary: '#a3a3a3',
          muted: '#6b6b6b'
        },
        accent: {
          DEFAULT: '#d4a574',
          hover: '#e0b88a',
          muted: 'rgba(212, 165, 116, 0.15)'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Outfit', 'sans-serif']
      }
    }
  },
  plugins: [animate, lineClamp]
};

export default config;
