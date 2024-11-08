import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

import reactCompiler from 'eslint-plugin-react-compiler';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});


const config = [
  {
    ignores: ["node_modules/**", "src/TODO/**"],
  },
  // js.configs.recommended, // think this is baked in below
  ...compat.extends("next/core-web-vitals", "next/typescript", "prettier"),
  {
    plugins: {
      'react-compiler': reactCompiler,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { "args": "none" }],
      "no-unused-vars": "off",
      "@typescript-eslint/no-shadow": ["error", { "hoist": "all", "builtinGlobals": false }],
      "@next/next/no-img-element": "off",
      "@next/next/no-html-link-for-pages": "off",
      "no-console": "error",
      "import/no-unresolved": "error",

    }
  }
];
export default config;
