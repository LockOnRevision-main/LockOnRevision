import js from "@eslint/js";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

const browserGlobals = {
  AbortController: "readonly",
  Blob: "readonly",
  CustomEvent: "readonly",
  FormData: "readonly",
  console: "readonly",
  document: "readonly",
  fetch: "readonly",
  FileReader: "readonly",
  IntersectionObserver: "readonly",
  localStorage: "readonly",
  navigator: "readonly",
  setTimeout: "readonly",
  requestAnimationFrame: "readonly",
  window: "readonly",
};

const nodeGlobals = {
  Buffer: "readonly",
  clearTimeout: "readonly",
  console: "readonly",
  fetch: "readonly",
  process: "readonly",
  setTimeout: "readonly",
};

export default [
  {
    ignores: ["dist/**", "node_modules/**", "functions/node_modules/**", ".vercel/**"],
  },
  js.configs.recommended,
  {
    files: ["src/**/*.{js,jsx}"],
    plugins: {
      react,
      "react-hooks": reactHooks,
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: browserGlobals,
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
  {
    files: ["api/**/*.js", "functions/**/*.js", "*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: nodeGlobals,
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
];
