/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("nativewind/preset")], // RN 안전 프리셋
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#4F46E5",
        bg: "#0B0B0B",
        surface: "#121212",
        myBubble: "#DCF8C6",
        otherBubble: "#FFFFFF",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
