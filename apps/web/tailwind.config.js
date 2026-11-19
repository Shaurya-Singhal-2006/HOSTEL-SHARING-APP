/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: 'var(--bg)', raised: 'var(--bg-raised)',
        ink: 'var(--text)', muted: 'var(--text-muted)', accent: 'var(--accent)',
        success: 'var(--success)', warning: 'var(--warning)', danger: 'var(--danger)',
      },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      boxShadow: {
        neu: '8px 8px 16px var(--shadow-dark), -8px -8px 16px var(--shadow-light)',
        'neu-sm': '4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light)',
        inset: 'inset 6px 6px 12px var(--shadow-dark), inset -6px -6px 12px var(--shadow-light)',
        'inset-sm': 'inset 3px 3px 6px var(--shadow-dark), inset -3px -3px 6px var(--shadow-light)',
      },
    },
  },
  plugins: [],
}
