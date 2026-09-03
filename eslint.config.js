import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import noAwaitedJsxSpread from "./eslint/no-awaited-jsx-spread.js";
import noClientServerImport from "./eslint/no-client-server-import.js";
import noFieldDefaultAssertion from "./eslint/no-field-default-assertion.js";

const kenstack = {
  meta: { name: "kenstack" },
  rules: {
    "no-awaited-jsx-spread": noAwaitedJsxSpread,
    "no-client-server-import": noClientServerImport,
    "no-field-default-assertion": noFieldDefaultAssertion,
  },
};

export const deepRelativeImportPattern = {
  regex: String.raw`^\.\./\.\.`,
  message:
    "Use the repository alias for imports that traverse two or more parent directories.",
};

const restatedFieldDefaults = [
  {
    selector:
      "CallExpression[callee.name=/^(field|defineField)$/] > ObjectExpression > Property[key.name='searchable'][value.value=false]",
    message:
      "Omit searchable: false from field() and defineField(); it is the field-map default.",
  },
  {
    selector:
      "CallExpression[callee.name=/^(field|defineField)$/] > ObjectExpression > Property[key.name='revisions'][value.value=true]",
    message:
      "Omit revisions: true from field() and defineField(); it is the field-map default.",
  },
];

const privateFieldMarker = {
  selector:
    "ObjectExpression > Property[key.name='__kenstackField'], ObjectExpression > Property[key.value='__kenstackField']",
  message:
    "Create fields with field(), defineField(), or an existing field helper; __kenstackField is private to Kenstack's field factories.",
};

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "tmp/**",
  ]),
  {
    plugins: { kenstack },
    rules: {
      "@next/next/no-img-element": "off",
      "@next/next/no-html-link-for-pages": "off",
      "@typescript-eslint/no-inferrable-types": [
        "error",
        { ignoreParameters: true, ignoreProperties: true },
      ],
      "import/no-cycle": [
        "error",
        { disableScc: true, ignoreExternal: true, maxDepth: 1 },
      ],
      "kenstack/no-awaited-jsx-spread": "error",
      "kenstack/no-client-server-import": "error",
      "kenstack/no-field-default-assertion": "error",
      "no-console": "error",
      "no-restricted-imports": [
        "error",
        { patterns: [deepRelativeImportPattern] },
      ],
      "no-restricted-syntax": ["error", ...restatedFieldDefaults],
    },
  },
  {
    files: ["src/**/*.{js,jsx,ts,tsx}", "kenstack/src/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        ...restatedFieldDefaults,
        privateFieldMarker,
      ],
    },
  },
  {
    files: ["src/fields/field.ts", "kenstack/src/fields/field.ts"],
    rules: {
      "no-restricted-syntax": ["error", ...restatedFieldDefaults],
    },
  },
  {
    basePath: import.meta.dirname,
    files: ["src/fields/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "import/no-restricted-paths": [
        "error",
        {
          basePath: import.meta.dirname,
          zones: [
            {
              target: "./src/fields/**/*",
              from: "./src/fields/index.ts",
              message:
                "A field unit cannot import the public fields aggregate; import the owning field module directly.",
            },
          ],
        },
      ],
    },
  },
]);
