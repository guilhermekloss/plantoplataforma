import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        terracota: {
          DEFAULT: "#dd5e2e",
          50: "#fdf3ee",
          100: "#fae2d4",
          500: "#dd5e2e",
          600: "#c24a1e",
          700: "#9c3a17",
        },
      },
      fontFamily: {
        sans: ["var(--font-poppins)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
