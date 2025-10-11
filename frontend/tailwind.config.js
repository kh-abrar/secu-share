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
      },
      keyframes: {
        "in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "out": {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        "slide-in-from-right": {
          "0%": { transform: "translateX(calc(100% + 2rem))" },
          "100%": { transform: "translateX(0)" },
        },
        "slide-out-to-right": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(calc(100% + 2rem))" },
        },
      },
      animation: {
        "in": "in 0.2s ease-out",
        "out": "out 0.2s ease-in",
        "slide-in-from-right": "slide-in-from-right 0.3s ease-out",
        "slide-out-to-right": "slide-out-to-right 0.2s ease-in",
      },
    },
  },
  plugins: [],
}
