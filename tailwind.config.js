/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0b0d17',
          card: '#11141f',
          elev: '#161a28',
          hover: '#1c2032',
        },
        border: {
          DEFAULT: '#252a3d',
          hover: '#323852',
        },
        accent: {
          DEFAULT: '#a78bfa',
          glow: 'rgba(167, 139, 250, 0.18)',
          soft: 'rgba(167, 139, 250, 0.10)',
        },
        success: '#34d399',
        warn: '#fbbf24',
        danger: '#fb7185',
        info: '#60a5fa',
        muted: '#7e87a3',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px rgba(0,0,0,0.35)',
        glow: '0 0 0 1px rgba(167,139,250,0.35), 0 8px 32px rgba(167,139,250,0.18)',
      },
      backgroundImage: {
        'card-gradient':
          'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
        'accent-gradient':
          'linear-gradient(135deg, rgba(167,139,250,0.25), rgba(99,102,241,0.15))',
      },
    },
  },
  plugins: [],
}
