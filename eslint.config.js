import js from "@eslint/js";
import importPlugin from "eslint-plugin-import";
import nPlugin from "eslint-plugin-n";
import promisePlugin from "eslint-plugin-promise";

export default [
  js.configs.recommended,  
  {
    plugins: {
      import: importPlugin,
      n: nPlugin,
      promise: promisePlugin
    },
    ignores: [
      "projects/**/*",
      "**/node_modules",
      "**/dist",
      "**/platforms",
      "**/plugins",
      "**/www"
    ],
    languageOptions: {
      globals: {
        process: "readonly",
        setTimeout: "readonly"
      }
    },
    rules: {
      quotes: ["error", "double"],
      semi: ["error", "always"],
      "space-before-function-paren": ["error", "never"]
    } 
  }
];
