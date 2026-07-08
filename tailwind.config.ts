import type { Config } from 'tailwindcss';

/**
 * DarkSet Design System — "Graphite + Volt" (2026)
 * Tokens canônicos. Nunca usar hex hardcoded nas páginas — sempre estas classes.
 */
const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg:      'var(--bg)',
        surface: {
          1: 'var(--surface-1)',
          2: 'var(--surface-2)',
          3: 'var(--surface-3)',
        },
        line:    'var(--line)',
        ink: {
          1: 'var(--ink-1)',
          2: 'var(--ink-2)',
          3: 'var(--ink-3)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent-rgb) / <alpha-value>)',
          hover:   'var(--accent-hover)',
          ink:     'var(--accent-ink)',
          soft:    'var(--accent-soft)',
        },
        ok:     { DEFAULT: 'rgb(var(--ok-rgb) / <alpha-value>)',     soft: 'var(--ok-soft)' },
        warn:   { DEFAULT: 'rgb(var(--warn-rgb) / <alpha-value>)',   soft: 'var(--warn-soft)' },
        danger: { DEFAULT: 'rgb(var(--danger-rgb) / <alpha-value>)', soft: 'var(--danger-soft)' },
        info:   { DEFAULT: 'rgb(var(--info-rgb) / <alpha-value>)',   soft: 'var(--info-soft)' },
        // Logo — único lugar onde o vermelho da marca é permitido
        brand:  '#E31B23',

        // Compat shadcn/ui (componentes em components/ui consomem estes vars)
        background: 'var(--bg)',
        foreground: 'var(--ink-1)',
        card:   { DEFAULT: 'var(--surface-1)', foreground: 'var(--ink-1)' },
        border: 'var(--line)',
        input:  'var(--line)',
        primary:{ DEFAULT: 'var(--accent)', foreground: 'var(--accent-ink)' },
        muted:  { DEFAULT: 'var(--surface-2)', foreground: 'var(--ink-2)' },
        ring:   'var(--accent)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        sans:    ['var(--font-body)', 'sans-serif'],
        logo:    ['var(--font-logo)', 'sans-serif'],
      },
      borderRadius: {
        lg:    'var(--radius)',
        md:    'calc(var(--radius) - 4px)',
        sm:    'calc(var(--radius) - 8px)',
        xl:    '0.875rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      boxShadow: {
        card:  '0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 24px -12px rgba(0,0,0,0.5)',
        float: '0 12px 32px -8px rgba(0,0,0,0.65)',
        volt:  '0 8px 28px -8px rgba(200,245,66,0.35)',
      },
    },
  },
  plugins: [],
};

export default config;
