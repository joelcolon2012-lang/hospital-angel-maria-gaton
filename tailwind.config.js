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
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
