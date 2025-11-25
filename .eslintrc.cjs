/* eslint-env node */
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "unused-imports", "import"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "next/core-web-vitals",
    "plugin:react-hooks/recommended"
  ],
  rules: {
    "unused-imports/no-unused-imports": "warn",
    "import/order": "off",
    "@typescript-eslint/consistent-type-imports": "warn",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/ban-ts-comment": "warn"
  },
  ignorePatterns: ["**/dist/**", "**/.next/**", "**/coverage/**", "**/node_modules/**"]
};
