/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ATOZ brand green — overrides Tailwind's default green scale
        green: {
          50: '#E4F2EC',
          100: '#D3E6DC',
          200: '#A9CFBD',
          300: '#79B49B',
          400: '#3E9673',
          500: '#0E7A52',
          600: '#0E7A52',
          700: '#0B5E40',
          800: '#0A4A34',
          900: '#073827',
        },
      },
      fontFamily: {
        serif: ['Sora', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
