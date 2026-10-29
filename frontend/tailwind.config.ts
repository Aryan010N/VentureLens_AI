import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#090D16",
        foreground: "#F1F5F9",
        card: {
          DEFAULT: "rgba(15, 23, 42, 0.75)",
          border: "rgba(20, 184, 166, 0.2)",
          hover: "rgba(30, 41, 59, 0.85)",
        },
        teal: {
          50: "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
          800: "#115e59",
          900: "#134e4a",
          950: "#042f2e",
        },
        emerald: {
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
        },
      },
      boxShadow: {
        "teal-glow": "0 0 25px -5px rgba(20, 184, 166, 0.25)",
        "teal-sm": "0 0 15px -3px rgba(20, 184, 166, 0.3)",
        "premium": "0 10px 30px -10px rgba(15, 23, 42, 0.08), 0 4px 6px -2px rgba(15, 23, 42, 0.03)",
        "premium-hover": "0 20px 40px -15px rgba(13, 148, 136, 0.15), 0 8px 12px -3px rgba(15, 23, 42, 0.05)",
      },
      keyframes: {
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        fadeUp: {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        floatSlow: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.6", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.02)" },
        },
      },
      animation: {
        shimmer: "shimmer 2.5s infinite",
        "fade-in": "fadeIn 0.35s ease-out forwards",
        "fade-up": "fadeUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "float-slow": "floatSlow 4s ease-in-out infinite",
        "pulse-glow": "pulseGlow 2.5s ease-in-out infinite",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "mesh-dark": "radial-gradient(at 100% 0%, rgba(13, 148, 136, 0.15) 0px, transparent 50%), radial-gradient(at 0% 100%, rgba(16, 185, 129, 0.1) 0px, transparent 50%)",
      },
    },
  },
  plugins: [],
};
export default config;
