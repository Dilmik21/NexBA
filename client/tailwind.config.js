/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2979FF', 
        secondary: '#00B0FF',
        navy: '#00274D',
        background: '#F8F9FD',
      }
    },
  },
  plugins: [],
}