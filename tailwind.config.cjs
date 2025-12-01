/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts,tsx}",
    "./functions/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#16a34a",
        secondary: "#f97316",
        accent: "#0ea5e9"
      }
    }
  },
  plugins: []
};
