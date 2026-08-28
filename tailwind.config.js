/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
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
