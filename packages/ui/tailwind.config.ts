import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}", "../../apps/web/app/**/*.{ts,tsx}", "../../apps/web/components/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: []
} satisfies Config;
