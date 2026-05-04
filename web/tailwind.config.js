/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#fdf4ff",
          100: "#fae8ff",
          500: "#a855f7",
          600: "#9333ea",
          700: "#7e22ce",
          900: "#3b0764",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
