import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        csc: {
          blue: "#1E40AF",
          green: "#065F46",
          amber: "#92400E",
          red: "#991B1B",
          slate: "#334155"
        }
      },
    },
  },
  plugins: [],
};
export default config;
