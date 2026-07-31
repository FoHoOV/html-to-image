import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import globals from "globals";
import tseslint from "typescript-eslint";
import compat from "eslint-plugin-compat";

export default defineConfig([
  {
    name: "project/ignores",
    ignores: [".vitest/**", "dist/**", "test/resources/**"],
  },
  {
    name: "project/source",
    files: ["**/*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: "latest",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      sourceType: "module",
    },
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },
    rules: {
      "no-console": ["error", { allow: ["warn", "error"] }],
      "no-unused-vars": "off",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          disallowTypeAnnotations: true,
          fixStyle: "separate-type-imports",
          prefer: "type-imports",
        },
      ],
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-import-type-side-effects": "error",
      "@typescript-eslint/no-namespace": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "all",
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          ignoreRestSiblings: true,
          vars: "all",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
  eslintConfigPrettier,
  {
    name: "project/browser-compatibility",
    files: ["src/**/*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}"],
    extends: [compat.configs["flat/recommended"]],
    settings: {
      lintAllEsApis: true,
    },
    rules: {
      // eslint-plugin-compat cannot infer these members, so guard its known gaps.
      "no-restricted-properties": [
        "error",
        {
          property: "computedStyleMap",
          message:
            "CSS Typed OM is unavailable in supported Firefox and Safari versions. Feature-detect it and provide a CSSOM fallback.",
        },
        {
          object: "navigator",
          property: "share",
          message:
            "The Web Share API is unavailable by default in supported Firefox versions.",
        },
      ],
    },
  },
]);
