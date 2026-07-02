import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import storybook from "eslint-plugin-storybook";
import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules/.prisma/**",
    "storybook-static/**",
  ]),
  ...storybook.configs["flat/recommended"],
  // Type-aware linting (required for no-deprecated rule)
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: [".storybook/*.ts", "eslint.config.mjs"],
        },
      },
    },
    rules: {
      "@typescript-eslint/no-deprecated": "warn",
    },
  },
]);

export default eslintConfig;
