import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },
  // Enforce pure core boundary — no Chrome or React in src/core/
  {
    files: ["src/core/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["react", "react-dom", "react/*", "react-dom/*"],
              message: "src/core/ must not import React — keep it pure.",
            },
          ],
        },
      ],
      "no-restricted-globals": [
        "error",
        {
          name: "chrome",
          message: "src/core/ must not access Chrome APIs — keep it pure.",
        },
      ],
    },
  },
  {
    ignores: ["dist/", "node_modules/", "*.config.*"],
  },
);
