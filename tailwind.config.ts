import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          400: '#facc15',
          500: '#eab308',
          600: '#ca8a04',
        },
      },
      animation: {
        'regenerate-glow': 'regenerate-glow 2s ease-in-out',
        'stat-change': 'stat-change 0.5s ease-out',
        'shimmer': 'shimmer 2s infinite',
      },
      keyframes: {
        'regenerate-glow': {
          '0%': { boxShadow: '0 0 0 0 rgba(234, 179, 8, 0)' },
          '50%': { boxShadow: '0 0 60px 30px rgba(234, 179, 8, 0.6)' },
          '100%': { boxShadow: '0 0 0 0 rgba(234, 179, 8, 0)' },
        },
        'stat-change': {
          '0%': { transform: 'scale(1.2)', color: '#facc15' },
          '100%': { transform: 'scale(1)', color: 'inherit' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
export default config
