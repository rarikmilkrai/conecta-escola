/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: { DEFAULT: "#FAF8F3", 2: "#F4F1EA", 3: "#EFEADF" },
        ink: { DEFAULT: "#1F2A37", soft: "#5B6472", mute: "#8A919C" },
        brand: { DEFAULT: "#2B6352", dark: "#214E41", light: "#E3EDE8", 50: "#F0F5F2" },
        mustard: { DEFAULT: "#F0D58A", dark: "#E4C366", light: "#FBF1D3" },
        coral: { DEFAULT: "#D9643A" },
        line: "#E7E2D8",
      },
      fontFamily: {
        display: ['"Manrope"', "system-ui", "sans-serif"],
        sans: ['"DM Sans"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(31,42,55,.04), 0 4px 16px rgba(31,42,55,.04)",
        pop: "0 10px 40px rgba(31,42,55,.10)",
      },
    },
  },
  plugins: [],
};
