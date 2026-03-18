import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#060608', card: '#0e0e11',
        border: '#202028', accent: '#e31b23',
        'accent-dim': '#a81018', success: '#22c55e',
        'text-main': '#f0f0f2', 'text-sub': '#9898a8',
        'text-muted': '#5a5a6a', 'text-dim': '#323240',
      },
      fontFamily: {
        condensed: ['"Barlow Condensed"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
