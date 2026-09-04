/** @type {import('tailwindcss').Config} */
// Light mode ONLY — darkMode is intentionally NOT configured and no `dark:`
// variants are used anywhere in the codebase (see Style Guide).
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      colors: {
        border: "hsl(214 32% 91%)",
        input: "hsl(214 32% 91%)",
        ring: "hsl(221 83% 53%)",
        background: "hsl(0 0% 100%)",
        foreground: "hsl(222 47% 11%)",
        primary: {
          DEFAULT: "hsl(221 83% 53%)", // blue-600
          foreground: "hsl(0 0% 100%)",
        },
        success: "hsl(142 71% 45%)", // emerald
        warning: "hsl(38 92% 50%)", // amber
        danger: "hsl(347 77% 50%)", // rose
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
