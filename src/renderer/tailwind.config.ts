import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['index.html', 'src/**/*.{vue,ts}'],
  important: '.opencor',
  theme: {
    extend: {}
  }
};

export default config;
