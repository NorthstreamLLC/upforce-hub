import type { Config } from "tailwindcss";

/* Tailwind carries layout utilities only. Every colour in this app is a CSS
   custom property so the theme toggle can cross-fade the whole palette at
   once; exposing the tokens here lets utilities reach them without ever
   hardcoding a hex. */
const tokens = Object.fromEntries(
  Array.from({ length: 53 }, (_, i) => [`t${i}`, `var(--t${i})`])
);

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ...tokens,
        accent: "var(--ta)",
        good: "var(--tg)",
        err: "var(--terr)",
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: { panel: "var(--shadow)" },
    },
  },
  plugins: [],
};
export default config;
