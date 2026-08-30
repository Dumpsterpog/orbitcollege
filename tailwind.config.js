/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      // Semantic colours only — every one resolves to a CSS variable defined
      // in styles/tokens.css, so a component never hardcodes a light/dark
      // pair and the two themes can't drift apart. <alpha-value> keeps
      // Tailwind's /opacity modifiers working (e.g. bg-surface/60).
      colors: {
        surface: {
          DEFAULT: "rgb(var(--bg) / <alpha-value>)",
          subtle: "rgb(var(--bg-subtle) / <alpha-value>)",
          elevated: "rgb(var(--bg-elevated) / <alpha-value>)",
          inset: "rgb(var(--bg-inset) / <alpha-value>)",
        },
        line: {
          DEFAULT: "rgb(var(--border) / <alpha-value>)",
          strong: "rgb(var(--border-strong) / <alpha-value>)",
        },
        content: {
          DEFAULT: "rgb(var(--text) / <alpha-value>)",
          secondary: "rgb(var(--text-secondary) / <alpha-value>)",
          muted: "rgb(var(--text-muted) / <alpha-value>)",
          faint: "rgb(var(--text-faint) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          hover: "rgb(var(--accent-hover) / <alpha-value>)",
          fg: "rgb(var(--accent-fg) / <alpha-value>)",
          subtle: "rgb(var(--accent-subtle) / <alpha-value>)",
        },
        solid: {
          DEFAULT: "rgb(var(--solid) / <alpha-value>)",
          hover: "rgb(var(--solid-hover) / <alpha-value>)",
          fg: "rgb(var(--solid-fg) / <alpha-value>)",
        },
        danger: {
          DEFAULT: "rgb(var(--danger) / <alpha-value>)",
          subtle: "rgb(var(--danger-subtle) / <alpha-value>)",
        },
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
        sm: "var(--radius-sm)",
        lg: "var(--radius-lg)",
      },
      // Dense product type scale — 13px is the body size, not 16px.
      fontSize: {
        "2xs": ["11px", { lineHeight: "16px", letterSpacing: "0.01em" }],
        xs: ["12px", { lineHeight: "16px" }],
        sm: ["13px", { lineHeight: "18px" }],
        base: ["14px", { lineHeight: "20px" }],
        lg: ["16px", { lineHeight: "22px", letterSpacing: "-0.01em" }],
        xl: ["19px", { lineHeight: "25px", letterSpacing: "-0.015em" }],
        "2xl": ["23px", { lineHeight: "29px", letterSpacing: "-0.02em" }],
        "3xl": ["30px", { lineHeight: "36px", letterSpacing: "-0.025em" }],
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        popIn: {
          "0%": { opacity: "0", transform: "scale(0.92)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        floatSlow: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "50%": { transform: "translate(24px, -18px) scale(1.06)" },
        },
        floatSlow2: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "50%": { transform: "translate(-18px, 16px) scale(1.08)" },
        },
        glowPulse: {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "fade-in-up": "fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in": "fadeIn 0.4s ease-out both",
        "pop-in": "popIn 0.28s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        shimmer: "shimmer 1.8s ease-in-out infinite",
        "float-slow": "floatSlow 10s ease-in-out infinite",
        "float-slow-2": "floatSlow2 12s ease-in-out infinite",
        "glow-pulse": "glowPulse 2.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
