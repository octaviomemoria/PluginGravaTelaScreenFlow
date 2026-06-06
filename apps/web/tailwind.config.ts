import type { Config } from "tailwindcss"
import typography from "@tailwindcss/typography"

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
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
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [typography],
}

export default config
