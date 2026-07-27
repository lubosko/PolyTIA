/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0d1117',
        panel: '#161b22',
        border: '#30363d',
        hover: '#1c2128',
        accent: '#58a6ff',
        green: '#3fb950',
        red: '#f85149',
        yellow: '#d29922',
        purple: '#bc8cff',
        muted: '#8b949e',
        text: '#e6edf3',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
