/** @type {import('tailwindcss').Config} */
export default {
  content: ['src/renderer/index.html', 'src/renderer/src/**/*.{vue,ts}'],
  theme: {
    extend: {}
  },
  // eslint-disable-next-line @typescript-eslint/no-require-imports, no-undef
  plugins: [require('tailwindcss-primeui')]
}
