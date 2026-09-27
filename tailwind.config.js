/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        petrol: {
          50: '#f0f9fa',
          100: '#daf0f3',
          200: '#b9e2e8',
          300: '#89cdd8',
          400: '#52b0c2',
          500: '#3493a7',
          600: '#2b778b',
          700: '#276172',
          800: '#134E5E',
          900: '#0F4C5C',
          950: '#07242c',
        },
        ivory: {
          50: '#fdfdfb',
          100: '#fbfbf6',
          200: '#f7f6ec',
          300: '#f1efdc',
          400: '#e5e1bf',
          DEFAULT: '#FAF9F6'
        },
        clinical: {
          bg: '#F8FAFC',
          card: '#FFFFFF',
          border: '#E2E8F0',
          darkBg: '#0F172A',
          darkCard: '#1E293B',
          darkBorder: '#334155'
        }
      },
      keyframes: {
        'hr-fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'hr-scale-up': { from: { opacity: '0', transform: 'translateY(6px) scale(0.98)' }, to: { opacity: '1', transform: 'none' } },
        'hr-slide-down': { from: { opacity: '0', transform: 'translateY(-8px)' }, to: { opacity: '1', transform: 'none' } },
        'hr-slide-up': { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'none' } },
      },
      animation: {
        'fade-in': 'hr-fade-in 180ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade': 'hr-fade-in 180ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-up': 'hr-scale-up 220ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-down': 'hr-slide-down 220ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-up': 'hr-slide-up 240ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'spin-slow': 'spin 2.4s linear infinite',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
