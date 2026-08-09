/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#1F1420',
          light: '#2B1C2E',
          soft: '#3A2740',
        },
        plum: {
          DEFAULT: '#5B2333',
          dark: '#43192A',
          light: '#7A3049',
        },
        brass: {
          DEFAULT: '#C79A4B',
          light: '#E0C07E',
          dark: '#A87F38',
        },
        cream: '#FAF7F2',
        paper: '#FFFFFF',
        muted: '#8A8290',
        success: '#2F7D5E',
        danger: '#B23A48',
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(31,20,32,0.06), 0 8px 24px -8px rgba(31,20,32,0.10)',
        soft: '0 1px 3px rgba(31,20,32,0.08)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
}
