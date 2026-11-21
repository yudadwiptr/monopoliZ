/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand blue — taken from the MonopoliZ logo (white wordmark on #3A8CD6)
        brand: {
          200: '#BFE0FB',
          300: '#8CC4F5',
          400: '#5AA6EC',
          500: '#3A8CD6',
          600: '#2A70B8',
          700: '#1C5290',
          800: '#123A6A',
        },
        // "Nusantara Malam" — night-market archipelago palette
        ink: {
          950: '#05081A',
          900: '#0B1026',
          800: '#121A3D',
          700: '#1B2552',
          600: '#27336B',
          500: '#3A4785',
          400: '#5B68A6',
          300: '#8C96C9',
          200: '#BCC3E6',
          100: '#E4E8FA',
        },
        gold: {
          200: '#FFF0BF',
          300: '#FFE08A',
          400: '#FFD35C',
          500: '#FFC21F',
          600: '#E6A200',
          700: '#A86F00',
        },
        merah: {
          300: '#FF8FA3',
          400: '#FF5C7A',
          500: '#FF3B5C',
          600: '#E01E45',
          700: '#A3102F',
        },
        laut: {
          300: '#7FF0E6',
          400: '#45E3D6',
          500: '#22D3C5',
          600: '#0FA89C',
        },
        daun: {
          400: '#5EF0B0',
          500: '#2EE59D',
          600: '#14B877',
        },
      },
      fontFamily: {
        display: ['Fredoka', 'ui-rounded', 'system-ui', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 10px 40px -10px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
        'glow-gold': '0 0 24px rgba(255,194,31,0.55), 0 0 60px rgba(255,194,31,0.25)',
        'glow-merah': '0 0 24px rgba(255,59,92,0.55), 0 0 60px rgba(255,59,92,0.25)',
        'glow-laut': '0 0 24px rgba(34,211,197,0.55), 0 0 60px rgba(34,211,197,0.25)',
        'glow-brand': '0 0 24px rgba(58,140,214,0.6), 0 0 60px rgba(58,140,214,0.3)',
        'btn-brand': '0 6px 0 #1C5290, 0 12px 24px -6px rgba(58,140,214,0.55)',
        'btn-gold': '0 6px 0 #A86F00, 0 12px 24px -6px rgba(255,194,31,0.5)',
        'btn-merah': '0 6px 0 #A3102F, 0 12px 24px -6px rgba(255,59,92,0.5)',
        'btn-ink': '0 6px 0 #05081A, 0 12px 24px -8px rgba(0,0,0,0.6)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        floaty: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.9' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        wiggle: {
          '0%,100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        'spin-slow': {
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        shimmer: 'shimmer 2.5s linear infinite',
        floaty: 'floaty 3s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 1.4s cubic-bezier(0.2,0.6,0.4,1) infinite',
        wiggle: 'wiggle 0.6s ease-in-out infinite',
        'spin-slow': 'spin-slow 12s linear infinite',
      },
    },
  },
  plugins: [],
};
