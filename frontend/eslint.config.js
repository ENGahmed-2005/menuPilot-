// ESLint flat config (ESLint 9) — same baseline as the Vite React template.
// Run: npm run lint
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default [
  // Generated third-party WebGL backgrounds (Originkit) are not linted.
  { ignores: ["dist", "node_modules", "src/pages/landing/components/backgrounds/**"] },
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // JSX usage isn't visible to core no-unused-vars without eslint-plugin-react,
      // so capitalised names (components) are ignored.
      "no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z_]", argsIgnorePattern: "^[A-Z_]", caughtErrors: "none" }],
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
  { files: ["vite.config.js", "eslint.config.js"], languageOptions: { globals: globals.node } },
];
