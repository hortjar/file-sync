import eslintConfigPrettier from "eslint-config-prettier";
import pluginImportX from "eslint-plugin-import-x";
import reactHooks from "eslint-plugin-react-hooks";
import unicorn from "eslint-plugin-unicorn";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "apps/desktop/src/generated/**",
      "apps/desktop/src-tauri/target/**",
    ],
  },
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: [
            "eslint.config.ts",
            "apps/desktop/vite.config.ts",
            "apps/desktop/hey-api.config.ts",
            "apps/desktop/openapi-ts.config.js",
          ],
        },
        tsconfigRootDir: new URL(".", import.meta.url).pathname,
      },
    },
  },
  {
    plugins: {
      unicorn,
      "react-hooks": reactHooks,
      "import-x": pluginImportX,
    },
    rules: {
      ...unicorn.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,

      // Allow PascalCase filenames for React components alongside kebab-case
      "unicorn/filename-case": ["error", { cases: { kebabCase: true, pascalCase: true } }],

      // Import ordering
      "import-x/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
      "import-x/no-duplicates": "error",
      "import-x/no-unresolved": "off",

      // TypeScript
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
    },
  },
  eslintConfigPrettier,
);
