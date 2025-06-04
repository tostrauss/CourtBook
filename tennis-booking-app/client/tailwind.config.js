/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        success: { // Added more shades for success
          50: '#f0fdf4',
          100: '#dcfce7', // Added
          200: '#bbf7d0', // Added
          300: '#86efac', // Added
          400: '#4ade80', // Added
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534', // Added
          900: '#14532d', // Added
          950: '#052e16', // Added
        },
        warning: { // Added more shades for warning
          50: '#fffbeb',
          100: '#fef3c7', // Added
          200: '#fde68a', // Added
          300: '#fcd34d', // Added
          400: '#fbbf24', // Added
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e', // Added
          900: '#78350f', // Added
          950: '#451a03', // Added
        },
        error: { // Added more shades for error
          50: '#fef2f2',
          100: '#fee2e2', // Added
          200: '#fecaca', // Added
          300: '#fca5a5', // Added
          400: '#f87171', // Added
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b', // Added
          900: '#7f1d1d', // Added
          950: '#450a0a', // Added
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
