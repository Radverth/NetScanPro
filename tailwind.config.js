/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f4f9',
          100: '#d9e2ef',
          200: '#b3c6de',
          300: '#8daace',
          400: '#678ebe',
          500: '#4172ae',
          600: '#345b8b',
          700: '#274468',
          800: '#1a2d46',
          900: '#1B2A4A',
          950: '#0d1623',
        },
        amber: {
          DEFAULT: '#F5A623',
          50: '#fef9ec',
          100: '#fdf0c8',
          200: '#fbdf8d',
          300: '#f9ca51',
          400: '#F5A623',
          500: '#e8900a',
          600: '#c97007',
          700: '#a44f0a',
          800: '#873e10',
          900: '#703311',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
