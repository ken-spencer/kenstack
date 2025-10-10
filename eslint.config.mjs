import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

import reactCompiler from "eslint-plugin-react-compiler";
import importPlugin from "eslint-plugin-import";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript", "prettier"),
  {
    rules: {
      "@next/next/no-img-element": "off",
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  {
    files: ["**/*.js", "**/*.jsx", "**/*.ts", "**/*.tsx"],
    plugins: {
      import: importPlugin,
      "react-compiler": reactCompiler,
    },
    settings: {
      "import/resolver": {
        typescript: {
          project: "./tsconfig.json", // or "tsconfig.base.json" if that’s what you use
        },
      },
    },
    // settings: {
    //   "import/resolver": {
    //     alias: {
    //       map: [["@kenstack", "./kenstack/src"], ["@", "./src"]],
    //       extensions: [".js", ".jsx", ".ts", ".tsx", ".json"],
    //     },
    //   },
    // },
    rules: {
      "no-unreachable": "error",
      "@typescript-eslint/no-unused-vars": ["error", { args: "none" }],
      "no-unused-vars": "off",
      // "@typescript-eslint/no-shadow": ["error", { "hoist": "all", "builtinGlobals": false }],
      "no-console": "error",
      "no-undef": "error",
      "import/no-unresolved": "error",
      // "no-duplicate-imports": "error",
      "@typescript-eslint/no-redeclare": "error",
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "no-undef": "off",
    },
  },
];

export default eslintConfig;
