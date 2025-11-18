// eslint.config.js
// Expo + React Hooks + React Refresh 통합 버전
// ----------------------------------------------------
// 참고: https://docs.expo.dev/guides/using-eslint/
// ----------------------------------------------------

import js from "@eslint/js";
import expoConfig from "eslint-config-expo/flat";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";

export default defineConfig([
  // 글로벌 ignore 설정 (dist, build 등)
  globalIgnores(["dist", "web-build", "android", "ios"]),

  // Expo 기본 설정
  expoConfig,

  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    extends: [
      js.configs.recommended,
      reactHooks.configs["recommended-latest"],
      reactRefresh.configs.vite,
    ],

    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: "latest",
        ecmaFeatures: { jsx: true },
        sourceType: "module",
      },
    },

    rules: {
      "no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z_]" }],
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },
]);
