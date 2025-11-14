import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import json from "@eslint/json";
import markdown from "@eslint/markdown";
import { defineConfig } from "eslint/config";
import stylistic from "@stylistic/eslint-plugin";


export default defineConfig([
  {
    ignores: [
      `dist/**.*`
    ]
  },
  { files: [`**/*.{js,mjs,cjs,ts,mts,cts}`], plugins: { js }, extends: [`js/recommended`] },
  { files: [`**/*.{js,mjs,cjs,ts,mts,cts}`], languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  tseslint.configs.recommended as unknown as Parameters<typeof defineConfig>,
  {
    plugins: {
      "@stylistic": stylistic,
    },
    rules: {
      "semi": [`error`],
      "no-unused-vars": [`off`],
      "@typescript-eslint/no-unused-vars": [`error`, {
        argsIgnorePattern: `^_`,
        // catch も同様のルール
        caughtErrorsIgnorePattern: `^_`,
        destructuredArrayIgnorePattern: `^_`,
        varsIgnorePattern: `^_`,
      }],
      "@stylistic/quotes": [`error`, "double", { "allowTemplateLiterals": "always" }],
    }
  },
  { files: [`**/*.json`], ignores: [`**/tsconfig.json`, `package-lock.json`,`**/.vscode/*.json`], plugins: { json }, language: `json/json`, extends: [`json/recommended`] },
  {
    files: [
      `**/tsconfig.json`,
      `**/*.code-workspace`,
      `**/.vscode/*.json`,
    ], 
    plugins: {json},
    language: "json/jsonc", 
    languageOptions: {
      allowTrailingCommas: true,
    },
    extends: ["json/recommended"],
  },
  { files: [`**/*.md`], plugins: { markdown }, language: `markdown/gfm`, extends: [`markdown/recommended`] },
]);
