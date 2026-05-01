/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}", // 👈 IMPORTANTE
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};