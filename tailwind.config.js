/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ATOZ brand green — overrides Tailwind's default green scale
        green: {
          50: '#E7F2EC',
          100: '#D3E6DC',
          200: '#A9CFBD',
          300: '#79B49B',
          400: '#3E9673',
          500: '#127A56',
          600: '#127A56',
          700: '#0C5C40',
          800: '#0A4A34',
          900: '#073827',
        },
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
