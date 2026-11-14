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
          // NoCapsAI palette: mint accent fading into deep teal (matches nocapsai.com)
          50:  "#EEFAF4",
          100: "#D3F3E4",
          200: "#A6E6CB",
          300: "#6CD3AC",
          400: "#2FBF8A",
          500: "#00A36C",
          600: "#00845A",
          700: "#0A6B4C",
          800: "#0C2A2E",
          900: "#06151C",
        },
        mint: "#00EC95",         // NoCapsAI signature accent
        paper: "#F4F8F6",        // light, slightly minty page background
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
