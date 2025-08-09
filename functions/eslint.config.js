import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  {
    files: ["**/*.{js,ts}"],
    languageOptions: {
      globals: { ...globals.node },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      // FIX 1: Prevents the internal linter crash
      "no-unused-expressions": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      
      // FIX 2: Prevents the "require() is forbidden" error
      "@typescript-eslint/no-require-imports": "off",

      // Other good rules to keep
      "quotes": ["error", "double"],
    },
  },
  ...tseslint.configs.recommended,
];