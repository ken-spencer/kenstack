const config = {
  "parser": "@typescript-eslint/parser", 
  "env": {
    "browser": true,
    "node": true,
    "es6": true
  },
  "globals": {
    "JSX": "writable",
  },
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "next/core-web-vitals",
    "prettier"
  ],
  "plugins": [
    // "@typescript-eslint"
  ],
  "rules": {
    "@next/next/no-img-element": "off",
    "@typescript-eslint/no-unused-vars": ["error", { "args": "none" }],
    "no-unused-vars": "off",
    "no-console": "error",
    "import/no-unresolved": "error",
    "@typescript-eslint/no-shadow": ["error", { "hoist": "all", "builtinGlobals": false }],
  },
  "settings": {
    "import/resolver": {
      "node": {
        "extensions": [".js", ".jsx"]
      },
      "alias": {
        "map": [
          ["@site", "./site"]
        ],
        "extensions": [".js", ".jsx"]
      }
    }
  }
}

module.exports = config;
