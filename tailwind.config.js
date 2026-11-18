/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: '1.5rem', screens: { '2xl': '1280px' } },
    extend: {
      colors: {
        primary: { DEFAULT: '#183B56', foreground: '#FFFFFF', 50: '#F0F5F9', 100: '#D9E6EF', 200: '#B3CDDD', 300: '#7FA9C6', 400: '#4E86AD', 500: '#2F6A93', 600: '#183B56', 700: '#132F44', 800: '#0E2333', 900: '#091722' },
        secondary: { DEFAULT: '#2563EB', foreground: '#FFFFFF', 50: '#EFF5FF', 100: '#DBEAFE', 200: '#BFDBFE', 300: '#93C5FD', 400: '#60A5FA', 500: '#3B82F6', 600: '#2563EB', 700: '#1D4ED8', 800: '#1E40AF', 900: '#1E3A8A' },
        accent: { DEFAULT: '#14B8A6', foreground: '#042F2A', 50: '#F0FDFA', 100: '#CCFBF1', 500: '#14B8A6', 600: '#0D9488', 700: '#0F766E' },
        success: { DEFAULT: '#16A34A', foreground: '#FFFFFF', 50: '#F0FDF4', 100: '#DCFCE7', 600: '#16A34A', 700: '#15803D' },
        warning: { DEFAULT: '#F59E0B', foreground: '#451A03', 50: '#FFFBEB', 100: '#FEF3C7', 600: '#D97706', 700: '#B45309' },
        destructive: { DEFAULT: '#DC2626', foreground: '#FFFFFF', 50: '#FEF2F2', 100: '#FEE2E2', 600: '#DC2626', 700: '#B91C1C' },
        background: '#F8FAFC',
        card: '#FFFFFF',
        foreground: '#172033',
        muted: { DEFAULT: '#F1F5F9', foreground: '#64748B' },
        border: '#E2E8F0',
        input: '#E2E8F0',
        ring: '#2563EB',
        dark: { bg: '#0B1220', card: '#101A2C', border: '#1E293B', fg: '#E2E8F0' }
      },
      borderRadius: { lg: '0.75rem', xl: '1rem', '2xl': '1.25rem' },
      boxShadow: { card: '0 1px 3px 0 rgb(24 59 86 / 0.08), 0 1px 2px -1px rgb(24 59 86 / 0.08)', 'card-hover': '0 8px 24px -6px rgb(24 59 86 / 0.18)' },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'none' } },
        'slide-in': { from: { opacity: '0', transform: 'translateX(24px)' }, to: { opacity: '1', transform: 'none' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        pulse_soft: { '0%,100%': { opacity: '1' }, '50%': { opacity: '.55' } }
      },
      animation: { 'fade-in': 'fade-in .25s ease-out', 'slide-in': 'slide-in .3s ease-out', shimmer: 'shimmer 1.6s infinite', pulse_soft: 'pulse_soft 2s ease-in-out infinite' }
    }
  },
  plugins: []
}
