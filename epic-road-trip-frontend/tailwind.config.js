// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  darkMode: 'class', // We'll design for light mode primarily based on images
  theme: {
    extend: {
      colors: {
        'brand-blue': {
          light: '#E0F2FE', // A very light blue for subtle backgrounds/highlights
          DEFAULT: '#0EA5E9', // A vibrant sky blue (Tailwind's sky-500)
          medium: '#0284C7', // A slightly darker blue (Tailwind's sky-600)
          dark: '#0369A1',   // (Tailwind's sky-700)
        },
        'brand-background': '#F7F9FC', // A very light, slightly cool off-white
        'brand-text': '#1E293B',      // Dark slate for primary text (Tailwind's slate-800)
        'brand-text-secondary': '#475569', // Lighter slate for secondary text (Tailwind's slate-600)
        'brand-border': '#E2E8F0'     // Light border color (Tailwind's slate-200)
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', "Segoe UI", 'Roboto', "Helvetica Neue", 'Arial', "Noto Sans", 'sans-serif', "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"],
      },
      boxShadow: {
        'card': '0 4px 12px rgba(0, 0, 0, 0.05)',
        'card-lg': '0 10px 30px rgba(0,0,0,0.07)',
      },
      zIndex: { // Keep your existing z-index values if they are critical
        '1000': '1000',
        '1001': '1001',
        '1002': '1002',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'), // For better default form styling
  ],
}