import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,

  // Reduce noisy warnings while finishing features
  {
    linterOptions: {
      reportUnusedDisableDirectives: false,
    },
    rules: {
      // Ignore unused catch param like: catch (e) { ... }
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrors: "none",
        },
      ],
    },
  },

  // Allow 'any' where it's usually just JSON/meta payloads (fastest cleanup)
  {
    files: ["src/app/api/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: ["src/app/admin/**/*.tsx", "src/components/admin/**/*.tsx", "src/lib/audit.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },

  // If you don't want to touch this file yet
  {
    files: ["src/app/staff/found/new/found-create-form.tsx"],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },

  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);
