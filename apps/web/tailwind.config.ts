import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#142013",
        mist: "#f4f1e8",
        moss: "#718355",
        peel: "#f4b942",
        berry: "#c75146",
        clay: "#d8c3a5",
      },
      fontFamily: {
        display: ["Georgia", "serif"],
        sans: ["Segoe UI", "sans-serif"],
      },
      boxShadow: {
        panel: "0 20px 60px rgba(20, 32, 19, 0.16)",
      },
    },
  },
  plugins: [],
};

export default config;
