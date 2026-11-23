/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--bg)', surface: 'var(--surface)', raised: 'var(--bg-raised)',
        ink: 'var(--text)', muted: 'var(--text-muted)', accent: 'var(--primary)',
        aqua: 'var(--accent-aqua)', warm: 'var(--accent-warm)',
        success: 'var(--success)', warning: 'var(--warning)', danger: 'var(--danger)',
      },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      backgroundImage: { primary: 'var(--primary-gradient)' },
      boxShadow: {
        neu: 'var(--shadow-card)', 'neu-button': 'var(--shadow-button)', inset: 'var(--shadow-inset)',
      },
    },
  },
  plugins: [],
}
