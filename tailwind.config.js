/** @type {import('tailwindcss').Config} */

const v = (name) => `rgb(var(${name}) / <alpha-value>)`;

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: v("--bg"),
          sunken: v("--bg-sunken"),
          raised: v("--bg-raised"),
        },
        line: {
          DEFAULT: v("--line"),
          strong: v("--line-strong"),
        },
        ink: {
          DEFAULT: v("--ink"),
          2: v("--ink-2"),
          3: v("--ink-3"),
        },
        accent: {
          DEFAULT: v("--accent"),
          press: v("--accent-press"),
          ink: v("--accent-ink"),
          wash: v("--accent-wash"),
        },
        solid: {
          DEFAULT: v("--solid"),
          press: v("--solid-press"),
          ink: v("--solid-ink"),
        },
        danger: {
          DEFAULT: v("--danger"),
          wash: v("--danger-wash"),
        },
        success: v("--success"),

        // Expressive palette — assigned by meaning, used on both icons and
        // text (all values clear 4.5:1 on their theme's surface).
        c: {
          blue: v("--c-blue"),
          violet: v("--c-violet"),
          pink: v("--c-pink"),
          orange: v("--c-orange"),
          amber: v("--c-amber"),
          green: v("--c-green"),
          teal: v("--c-teal"),
          red: v("--c-red"),
        },
      },

      // Social-product scale: 14px body, 12px meta. Headings get weight and
      // tracking rather than size, which is what keeps a dense feed calm.
      fontSize: {
        "2xs": ["11px", { lineHeight: "14px" }],
        xs: ["12px", { lineHeight: "16px" }],
        sm: ["13px", { lineHeight: "18px" }],
        base: ["14px", { lineHeight: "20px" }],
        md: ["15px", { lineHeight: "21px" }],
        lg: ["16px", { lineHeight: "22px", letterSpacing: "-0.01em" }],
        xl: ["20px", { lineHeight: "26px", letterSpacing: "-0.02em" }],
        "2xl": ["24px", { lineHeight: "30px", letterSpacing: "-0.022em" }],
        "3xl": ["30px", { lineHeight: "36px", letterSpacing: "-0.028em" }],
        "4xl": ["40px", { lineHeight: "44px", letterSpacing: "-0.032em" }],
      },

      fontFamily: {
        sans: ["Geist", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },

      borderRadius: {
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius)",
        lg: "var(--radius-lg)",
      },

      // Fixed rail + column widths, so the shell is defined once here rather
      // than as magic numbers scattered through the screens.
      spacing: {
        rail: "244px",
        "rail-sm": "72px",
        feed: "470px",
        aside: "320px",
      },
      maxWidth: {
        feed: "470px",
        shell: "1160px",
        prose: "60ch",
      },

      boxShadow: {
        pop: "0 4px 24px rgb(0 0 0 / 0.12), 0 0 0 1px rgb(0 0 0 / 0.04)",
        lift: "0 2px 12px rgb(0 0 0 / 0.08)",
      },

      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        rise: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        pop: {
          from: { opacity: "0", transform: "scale(0.97)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        heart: {
          "0%": { transform: "scale(1)" },
          "40%": { transform: "scale(1.28)" },
          "100%": { transform: "scale(1)" },
        },
        shimmer: {
          from: { backgroundPosition: "-200% 0" },
          to: { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out both",
        rise: "rise 0.28s cubic-bezier(0.22, 1, 0.36, 1) both",
        pop: "pop 0.16s cubic-bezier(0.22, 1, 0.36, 1) both",
        heart: "heart 0.32s cubic-bezier(0.22, 1, 0.36, 1)",
        shimmer: "shimmer 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
