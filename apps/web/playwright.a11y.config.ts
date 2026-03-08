import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  grep: /@a11y/,
  use: { baseURL: "http://localhost:3000", headless: true }
});
