/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],

  darkMode: 'class',

  theme: {
    extend: {
      colors: {
        // Primary brand blue
        primary: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        // Dark sidebar
        dark: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          850: '#172032',
          900: '#0f172a',
          950: '#090e1a',
        },
        // Status colors
        success: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        warning: {
          50:  '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b',
          600: '#d97706',
        },
        danger: {
          50:  '#fff1f2',
          100: '#ffe4e6',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
        },
      },

      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'Fira Code',
          'Consolas',
          'monospace',
        ],
      },

      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },

      borderRadius: {
        '4xl': '2rem',
      },

      boxShadow: {
        'soft':    '0 2px 8px 0 rgba(0,0,0,0.06)',
        'medium':  '0 4px 16px 0 rgba(0,0,0,0.10)',
        'strong':  '0 8px 32px 0 rgba(0,0,0,0.16)',
        'glow':    '0 0 20px rgba(37,99,235,0.35)',
        'glow-sm': '0 0 10px rgba(37,99,235,0.25)',
        'inner-soft': 'inset 0 1px 3px rgba(0,0,0,0.08)',
      },

      backgroundImage: {
        'gradient-brand':
          'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
        'gradient-dark':
          'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        'gradient-card':
          'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
      },

      animation: {
        'fade-in':     'fadeIn 0.2s ease-out',
        'fade-up':     'fadeUp 0.3s ease-out',
        'slide-in':    'slideIn 0.25s ease-out',
        'slide-right': 'slideRight 0.25s ease-out',
        'pulse-slow':  'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'bounce-soft': 'bounceSoft 1s ease-in-out infinite',
        'spin-slow':   'spin 3s linear infinite',
        'recording':   'recording 1.5s ease-in-out infinite',
      },

      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%':   { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideRight: {
          '0%':   { opacity: '0', transform: 'translateX(12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-4px)' },
        },
        recording: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%':      { opacity: '0.5', transform: 'scale(0.95)' },
        },
      },

      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        'sidebar': '16rem',
      },

      transitionDuration: {
        '400': '400ms',
      },

      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },

      screens: {
        'xs': '480px',
      },
    },
  },

  plugins: [],
};