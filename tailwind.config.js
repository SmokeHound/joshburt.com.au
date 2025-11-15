/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./*.html'],
  theme: {
    extend: {
      colors: {
        // Near-black background
        'dark-bg': '#0a0a0a',
        'dark-bg-secondary': '#111111',
        'dark-bg-tertiary': '#181818',

        // Neon accent colors
        'neon-blue': '#00d4ff',
        'neon-pink': '#ff0080',
        'neon-green': '#00ff88',
        'neon-yellow': '#ffff00',
        'neon-purple': '#8000ff',
        'neon-orange': '#ff4000',
        'neon-cyan': '#00ffff',

        // Updated primary colors to use neon
        primary: '#00d4ff', // neon blue
        secondary: '#00ff88', // neon green
        accent: '#8000ff', // neon purple
        'primary-green': '#00ff88',
        'accent-red': '#ff0080',

        // Light text colors
        'text-primary': '#ffffff',
        'text-secondary': '#f0f0f0',
        'text-muted': '#cccccc'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif']
      },
      boxShadow: {
        'neon-blue': '0 0 20px #00d4ff40',
        'neon-pink': '0 0 20px #ff008040',
        'neon-green': '0 0 20px #00ff8840',
        'neon-purple': '0 0 20px #8000ff40',
        'neon-yellow': '0 0 20px #ffff0040'
      }
    }
  },
  plugins: []
};
