import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: {
          DEFAULT: 'var(--surface)',
          2: 'var(--surface-2)',
        },
        border: 'var(--border)',
        text: {
          DEFAULT: 'var(--text)',
          muted: 'var(--text-muted)',
          hint: 'var(--text-hint)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          soft: 'var(--accent-soft)',
        },
        highlight: 'var(--highlight)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        error: 'var(--error)',
      },
      borderColor: {
        DEFAULT: 'var(--border)',
      },
      borderRadius: {
        card: '12px',
        thumb: '10px',
        input: '8px',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        xs: ['12px', '16px'],
        sm: ['14px', '20px'],
        base: ['16px', '24px'],
        lg: ['18px', '26px'],
        xl: ['20px', '28px'],
        '2xl': ['24px', '32px'],
        '3xl': ['30px', '38px'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(33, 31, 27, 0.04), 0 2px 8px rgba(33, 31, 27, 0.06)',
        lift: '0 2px 4px rgba(33, 31, 27, 0.06), 0 8px 20px rgba(33, 31, 27, 0.10)',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-4px)' },
          '40%, 80%': { transform: 'translateX(4px)' },
        },
      },
      animation: {
        shake: 'shake 0.4s ease-in-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
