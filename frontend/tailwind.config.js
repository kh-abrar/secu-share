/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    "./src/**/*.{js,ts,jsx,tsx}",  
  ],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui'] },
      colors: {
        accent: { DEFAULT: '#2563eb' } // single blue accent
      }
    },
  },
  plugins: [],
}
