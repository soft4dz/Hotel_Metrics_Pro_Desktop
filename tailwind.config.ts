import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    screens: {
      xs: '480px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
      '3xl': '1920px',
      '4xl': '2560px',
    },
    extend: {
      fontFamily: {
        sans: ['"Manrope"', '"Noto Kufi Arabic"', '"Segoe UI"', 'system-ui', 'sans-serif'],
        heading: ['"Manrope"', '"Noto Kufi Arabic"', '"Segoe UI"', 'system-ui', 'sans-serif'],
        mono: ['"Fira Code"', 'ui-monospace', 'monospace'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        brand: {
          night: '#071525',
          navy: '#073B78',
          blue: '#145CAB',
          gold: '#0AA3AD',
          turquoise: '#0AA3AD',
          success: '#16A34A',
          danger: '#DC2626',
          warning: '#F97316',
          muted: '#F4F7FA',
          text: '#283746',
        },
        gold: {
          DEFAULT: 'hsl(var(--gold))',
          foreground: 'hsl(var(--gold-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 4px 14px -2px rgb(30 58 138 / 0.06)',
        elevated: '0 12px 40px -8px rgb(30 58 138 / 0.15), 0 4px 12px -4px rgb(15 23 42 / 0.08)',
        sidebar: '4px 0 24px -4px rgb(15 23 42 / 0.12)',
        inset: 'inset 0 1px 0 0 rgb(255 255 255 / 0.7)',
      },
      maxWidth: {
        'layout-content': 'var(--layout-max-w)',
        'layout-navbar': 'var(--layout-navbar-max-w)',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
