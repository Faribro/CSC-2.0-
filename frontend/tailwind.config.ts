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
        canvas: "var(--canvas)",
        surface: "var(--surface)",
        ink: {
          DEFAULT: "var(--ink)",
          muted: "var(--ink-muted)",
          inverted: "var(--ink-inverted)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          hover: "var(--primary-hover)",
          active: "var(--primary-active)",
        },
        plum: {
          DEFAULT: "var(--plum)",
          hover: "var(--plum-hover)",
          light: "var(--plum-light)",
        },
        sun: {
          DEFAULT: "var(--sun)",
          light: "var(--sun-light)",
        },
        mint: {
          DEFAULT: "var(--mint)",
          light: "var(--mint-light)",
        },
        lavender: {
          DEFAULT: "var(--lavender)",
          light: "var(--lavender-light)",
        },
        peach: {
          DEFAULT: "var(--peach)",
          light: "var(--peach-light)",
        },
        pink: {
          DEFAULT: "var(--pink)",
          light: "var(--pink-light)",
        },
        border: {
          DEFAULT: "var(--border)",
          light: "var(--border-light)",
        },
        success: {
          text: "var(--success-text)",
          bg: "var(--success-bg)",
          border: "var(--success-border)",
        },
        warning: {
          text: "var(--warning-text)",
          bg: "var(--warning-bg)",
          border: "var(--warning-border)",
        },
        error: {
          text: "var(--error-text)",
          bg: "var(--error-bg)",
          border: "var(--error-border)",
        },
      },
      borderRadius: {
        card: "var(--radius-card)",
        button: "var(--radius-button)",
        input: "var(--radius-input)",
      },
      boxShadow: {
        comic: "var(--shadow-comic)",
        "comic-raised": "var(--shadow-comic-raised)",
      },
      minHeight: {
        touch: "var(--touch-target)",
      },
      minWidth: {
        touch: "var(--touch-target)",
      },
    },
  },
  plugins: [],
};
export default config;
