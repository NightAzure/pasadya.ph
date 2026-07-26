import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/modules/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-field-guide-sans)",
          "var(--font-inter)",
          "Inter",
          "Arial",
          "sans-serif",
        ],
        display: [
          "var(--font-field-guide-display)",
          "var(--font-daylight-display)",
          "Newsreader",
          "Source Serif 4",
          "Georgia",
          "serif",
        ],
      },
      borderRadius: {
        lg: "14px 14px 34px 14px",
        md: "10px 10px 26px 10px",
        sm: "8px 8px 16px 8px",
      },
      boxShadow: {
        sm: "0 4px 12px rgba(20, 33, 61, 0.06)",
        md: "0 12px 32px rgba(20, 33, 61, 0.08)",
        lg: "0 18px 42px rgba(20, 33, 61, 0.13)",
      },
    },
  },
  plugins: [],
};

export default config;
