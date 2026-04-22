/** @type {import('tailwindcss').Config} */
export default {
  content: ['./app/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Design tokens — always reference these, never raw amber-X
        brand: {
          50: '#FDF8EE',
          100: '#FAEDD1',
          200: '#F4D89C',
          300: '#ECBD68',
          400: '#DDA13F',
          500: '#C4973A', // primary gold
          600: '#A87C26',
          700: '#8A631F',
          800: '#6E4E1B',
          900: '#4A3518',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      borderRadius: {
        xl: '0.875rem',
      },
    },
  },
  plugins: [],
}
