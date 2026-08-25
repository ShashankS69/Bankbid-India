/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        midnight: '#071525',
        deepnavy: '#0A1B2E',
        panelnavy: '#0D2238',
        elevatednavy: '#102A43',
        ledger: {
          DEFAULT: '#0D2238',
          panel: '#0D2238',
          line: '#173047',
        },
        gold: {
          DEFAULT: '#F28C26',
          warm: '#F28C26',
          copper: '#B98232',
        },
        maporange: '#F28C28',
        parchment: '#F4EFE3',
        ivory: '#F2EEE5',
        softwhite: '#D9DEE5',
        mutedslate: '#8B98A8',
        dimslate: '#5E6B7A',
        goldborder: '#8E6A32',
        navyborder: '#1D3852',
        subtleline: '#173047',
        ink: '#F2EEE5',
        slate: {
          DEFAULT: '#8B98A8',
          dim: '#5E6B7A',
        },
      },
      fontFamily: {
        display: ["var(--font-cormorant)", "Georgia", "serif"],
        body: ["var(--font-inter)", "system-ui", "sans-serif"],
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
