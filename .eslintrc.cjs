const config = {
  "parser": "@typescript-eslint/parser", 
  "env": {
    "browser": true,
    "node": true,
    "es6": true
  },
  "globals": {
    "JSX": "writable",
    "thaumazoAdmin": "writable",
    "thaumazoModels": "writable"
  },
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "next/core-web-vitals",
    "prettier"
  ],
  "plugins": [
    "@typescript-eslint"
  ],
  "rules": {
    "@next/next/no-img-element": "off",
    "@typescript-eslint/no-unused-vars": ["error", { "args": "none" }],
    "no-unused-vars": "off",
    "no-console": "error",
    "import/no-unresolved": "error"
  },
  "settings": {
    "import/resolver": {
      "node": {
        "extensions": [".js", ".jsx"]
      },
      "alias": {
        "map": [
          ["@thaumazo/cms", "./src"],
          // ["@thaumazo/forms", "./forms/src"],
          ["@site", "./site"]
        ],
        "extensions": [".js", ".jsx"]
      }
    }
  }
}

module.exports = config;
