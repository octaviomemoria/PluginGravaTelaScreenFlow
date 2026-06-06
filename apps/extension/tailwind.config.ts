import type { Config } from "tailwindcss"

const config: Config = {
  content: ["./src/**/*.{ts,tsx}", "./src/**/*.html"],
  theme: {
    extend: {
      colors: {
        background: "#0F172A",
        surface: "#1E293B",
        border: "#334155",
        "text-primary": "#F8FAFC",
        "text-secondary": "#94A3B8",
        accent: "#22C55E",
        "accent-hover": "#16A34A",
      },
    },
  },
  plugins: [],
}

export default config
