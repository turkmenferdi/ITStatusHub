import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        /* Brand */
        brand: {
          50:  "#ecfdf5",
          100: "#d1fae5",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          900: "#064e3b"
        },
        /* Status semantics */
        status: {
          green:  "#059669",
          yellow: "#d97706",
          red:    "#dc2626",
          blue:   "#0284c7"
        },
        /* Material Design 3 surface tokens */
        error:                    "#ba1a1a",
        "on-surface":             "#181c1e",
        background:               "#eef1f5",
        surface:                  "#f7fafc",
        "primary-container":      "#1a2b3c",
        "error-container":        "#ffdad6",
        "on-error-container":     "#93000a",
        "surface-container-lowest":  "#ffffff",
        "surface-container-high":    "#e5e9eb",
        "surface-container-low":     "#f1f4f6",
        primary:                  "#041627",
        "surface-container":      "#ebeef0",
        "on-primary":             "#ffffff",
        "on-surface-variant":     "#44474c",
        "outline-variant":        "#c4c6cd",
        "surface-container-highest": "#e0e3e5"
      },
      borderRadius: {
        DEFAULT: "0.375rem",
        lg:  "0.625rem",
        xl:  "0.875rem",
        "2xl": "1.25rem"
      },
      fontFamily: {
        headline: ["var(--font-manrope)", "Manrope", "sans-serif"],
        body:     ["var(--font-inter)",   "Inter",   "sans-serif"],
        label:    ["var(--font-inter)",   "Inter",   "sans-serif"]
      },
      boxShadow: {
        card:    "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)",
        "card-hover": "0 4px 12px 0 rgb(0 0 0 / 0.10), 0 2px 4px -2px rgb(0 0 0 / 0.08)",
        sidebar: "2px 0 12px 0 rgb(0 0 0 / 0.25)"
      }
    }
  },
  plugins: []
};

export default config;
