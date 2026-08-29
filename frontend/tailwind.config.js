/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "#E5E7EB",
        input: "#FFFFFF",
        ring: "#6C5CE7",
        background: "#FFFFFF",
        foreground: "#1F2937",
        primary: {
          DEFAULT: "#6C5CE7",
          foreground: "#FFFFFF",
          hover: "#5A4BD6",
        },
        secondary: {
          DEFAULT: "#1A237E",
          foreground: "#FFFFFF",
        },
        destructive: {
          DEFAULT: "#f43f5e",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#F3F4F6",
          foreground: "#6B7280",
        },
        accent: {
          DEFAULT: "#00B894",
          foreground: "#FFFFFF",
        },
        success: "#00B894",
        danger: "#f43f5e",
        "bg-dark": "#ffffff",
        "bg-card": "#FFFFFF",
        "text-light": "#1F2937",
        "text-muted": "#6B7280",
        slate: "#64748B",
      },
      fontFamily: {
        main: ['Outfit', 'sans-serif'],
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
      },
    },
  },
  plugins: [],
}
