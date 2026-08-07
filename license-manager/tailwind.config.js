/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Fira Sans"', 'system-ui', 'sans-serif'],
        mono: ['"Fira Code"', 'ui-monospace', 'monospace'],
      },
      colors: {
        brand: {
          DEFAULT: '#0f766e',
          dark: '#115e59',
          light: '#14b8a6',
        },
      },
    },
  },
  plugins: [],
};
