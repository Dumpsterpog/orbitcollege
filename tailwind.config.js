/** @type {import('tailwindcss').Config} */

// Colour helper — every colour resolves to a CSS variable in
// styles/tokens.css so light/dark is a variable swap, and <alpha-value>
// keeps Tailwind's /opacity modifiers working (e.g. bg-primary/10, which
// the mock leans on for the "Join" chips and the active filter pill).
const v = (name) => `rgb(var(${name}) / <alpha-value>)`;

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // ---- M3 names, matching the Stitch mock's vocabulary 1:1 ----
        primary: {
          DEFAULT: v("--m3-primary"),
          container: v("--m3-primary-container"),
          fixed: v("--m3-primary-fixed"),
        },
        "on-primary": {
          DEFAULT: v("--m3-on-primary"),
          container: v("--m3-on-primary-container"),
          "fixed-variant": v("--m3-on-primary-fixed-variant"),
        },
        secondary: {
          DEFAULT: v("--m3-secondary"),
          container: v("--m3-secondary-container"),
        },
        surface: {
          DEFAULT: v("--m3-surface"),
          "container-lowest": v("--m3-surface-container-lowest"),
          "container-low": v("--m3-surface-container-low"),
          container: v("--m3-surface-container"),
          "container-high": v("--m3-surface-container-high"),
          "container-highest": v("--m3-surface-container-highest"),
          variant: v("--m3-surface-variant"),
          dim: v("--m3-surface-dim"),
          // Aliases kept so the already-rebuilt screens keep resolving.
          subtle: v("--bg-subtle"),
          elevated: v("--bg-elevated"),
          inset: v("--bg-inset"),
        },
        "on-surface": {
          DEFAULT: v("--m3-on-surface"),
          variant: v("--m3-on-surface-variant"),
        },
        outline: {
          DEFAULT: v("--m3-outline"),
          variant: v("--m3-outline-variant"),
        },
        error: {
          DEFAULT: v("--m3-error"),
          container: v("--m3-error-container"),
        },
        "on-error": v("--m3-on-error"),
        "inverse-surface": v("--m3-inverse-surface"),
        "inverse-on-surface": v("--m3-inverse-on-surface"),

        // ---- Semantic aliases the existing 17 screens already use ----
        line: {
          DEFAULT: v("--border"),
          strong: v("--border-strong"),
        },
        content: {
          DEFAULT: v("--text"),
          secondary: v("--text-secondary"),
          muted: v("--text-muted"),
          faint: v("--text-faint"),
        },
        accent: {
          DEFAULT: v("--accent"),
          hover: v("--accent-hover"),
          fg: v("--accent-fg"),
          subtle: v("--accent-subtle"),
        },
        solid: {
          DEFAULT: v("--solid"),
          hover: v("--solid-hover"),
          fg: v("--solid-fg"),
        },
        icon: {
          blue: v("--icon-blue"),
          teal: v("--icon-teal"),
          amber: v("--icon-amber"),
          pink: v("--icon-pink"),
          green: v("--icon-green"),
          violet: v("--icon-violet"),
        },
        danger: {
          DEFAULT: v("--danger"),
          subtle: v("--danger-subtle"),
        },
      },

      // Named spacing from the mock. These sit alongside Tailwind's numeric
      // scale rather than replacing it, so p-4 and p-md both work.
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        gutter: "20px",
        unit: "4px",
        "margin-mobile": "16px",
        "margin-desktop": "48px",
      },
      maxWidth: { "max-width": "1200px" },

      borderRadius: {
        DEFAULT: "var(--radius)",
        sm: "var(--radius-sm)",
        lg: "var(--radius-lg)",
        xl: "0.75rem",
      },

      fontFamily: {
        sans: ["Geist", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },

      fontSize: {
        // M3 ramp from the mock, used by the new Home / Sidebar / TopBar.
        "headline-xl": ["40px", { lineHeight: "48px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-lg": ["32px", { lineHeight: "40px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-lg-mobile": ["28px", { lineHeight: "36px", fontWeight: "700" }],
        "headline-md": ["24px", { lineHeight: "32px", fontWeight: "600" }],
        "headline-sm": ["20px", { lineHeight: "28px", fontWeight: "600" }],
        "body-lg": ["18px", { lineHeight: "28px", fontWeight: "400" }],
        "body-md": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "body-sm": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "label-md": ["14px", { lineHeight: "16px", letterSpacing: "0.05em", fontWeight: "500" }],
        "label-sm": ["12px", { lineHeight: "14px", letterSpacing: "0.05em", fontWeight: "500" }],

        // Retained compact ramp the other screens are built on.
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
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        popIn: {
          "0%": { opacity: "0", transform: "scale(0.92)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-in-up": "fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in": "fadeIn 0.4s ease-out both",
        "pop-in": "popIn 0.28s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        shimmer: "shimmer 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
