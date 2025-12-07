/** @type {import('tailwindcss').Config} */
export default {
  content: ['index.html', 'src/**/*.{vue,ts}'],
  important: '.opencor-scoped-styles',
  theme: {
    extend: {}
  },
  plugins: [require('tailwindcss-primeui')]
};
