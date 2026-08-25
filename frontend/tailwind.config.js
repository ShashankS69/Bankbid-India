/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        ledger: {
          DEFAULT: "#0F1C2E",
          panel: "#16273D",
          line: "#233348",
        },
        parchment: "#F4EFE3",
        gold: {
          DEFAULT: "#C9A24B",
          soft: "#DFC280",
        },
        rust: "#B7472A",
        moss: "#4C7A5D",
        ink: "#E7E2D3",
        slate: {
          DEFAULT: "#8792A1",
          dim: "#5B6472",
        },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        body: ["var(--font-plex-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "monospace"],
      },
      backgroundImage: {
        "ledger-lines":
          "repeating-linear-gradient(0deg, transparent, transparent 27px, rgba(231,226,211,0.035) 28px)",
      },
    },
  },
  plugins: [],
};
