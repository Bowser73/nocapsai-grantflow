import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // GrantFlow palette — the paperwork itself.
        // brand = ledger ink (the blue-black of a filled-in form).
        brand: {
          50:  "#F2F5FA",
          100: "#E3EAF4",
          200: "#C9D6EA",
          300: "#9DB2D3",
          400: "#6A85B4",
          500: "#3F5E96",
          600: "#233F74",
          700: "#182E58",
          800: "#14213D",
          900: "#0C1630",
        },
        paper: "#FAFBF7",        // form stock (a cool white, not cream)
        rule: "#C9D6EA",         // ruled lines on a form
        highlight: "#FFE04A",    // highlighter: marks anything not yet verified
        stamp: {
          green: "#1E7B4F",      // approved / ready
          red: "#C2372B",        // due / overdue
        },
        success: {
          50:  "#f0fdf4",
          500: "#22c55e",
          700: "#15803d",
        },
        warning: {
          50:  "#fffbeb",
          500: "#f59e0b",
          700: "#b45309",
        },
        danger: {
          50:  "#fef2f2",
          500: "#ef4444",
          700: "#b91c1c",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
        type: ["var(--font-type)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        lg: "0.625rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
    },
  },
  plugins: [animate],
};

export default config;
