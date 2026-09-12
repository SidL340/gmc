import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#C9184A',
          50:  '#FFF0F3',
          100: '#FFD6E0',
          200: '#FFB3C1',
          300: '#FF85A1',
          400: '#FF4D6D',
          500: '#C9184A',
          600: '#A4133C',
          700: '#800F2F',
          800: '#590D22',
        },
        dark: '#1a1a2e',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
