import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Rules here encode the project's non-negotiables so they fail CI rather than
 * review. Anything that cannot be expressed as a lint rule stays in the
 * feature development checklist in the developer guide.
 */
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "next-env.d.ts",
  ]),

  {
    name: "elogbook/rules",
    rules: {
      // §4 — never bypass type checking.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // §1 — every HTTP call goes through the centralized instance.
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "axios",
              message:
                "Import the shared instance: `import { api } from '@/lib/api-client'`.",
            },
          ],
        },
      ],

      // §5 — named exports only, §8 — no inline styles.
      "no-restricted-syntax": [
        "error",
        {
          selector: "ExportDefaultDeclaration",
          message:
            "Named exports only. Default exports are reserved for Next.js route files.",
        },
        {
          selector: "JSXAttribute[name.name='style']",
          message:
            "No inline styles — use Tailwind utilities or an SCSS module.",
        },
        {
          selector: "TSAsExpression[typeAnnotation.typeName.name!='const']",
          message:
            "No `as` casts. Validate at the boundary with a Zod schema instead.",
        },
      ],

      // §10 — external links must be safe.
      "react/jsx-no-target-blank": [
        "error",
        { enforceDynamicLinks: "always", allowReferrer: false },
      ],

      // §7 — buttons must declare their type.
      "react/button-has-type": "error",
    },
  },

  // Next.js route files must default-export; the App Router requires it.
  {
    name: "elogbook/next-route-files",
    files: [
      "src/app/**/page.tsx",
      "src/app/**/layout.tsx",
      "src/app/**/loading.tsx",
      "src/app/**/template.tsx",
      "src/app/**/error.tsx",
      "src/app/**/global-error.tsx",
      "src/app/**/not-found.tsx",
      "src/app/**/default.tsx",
      "src/app/**/route.ts",
      "**/*.config.{ts,mts,js,mjs}",
    ],
    rules: {
      "no-restricted-syntax": "off",
    },
  },

  // shadcn primitives are generated — hold them to the framework's shape.
  {
    name: "elogbook/shadcn-generated",
    files: ["src/components/ui/**"],
    rules: {
      "no-restricted-syntax": "off",
      "react/button-has-type": "off",
    },
  },

  // The api-client is the one place allowed to know axios exists.
  {
    name: "elogbook/api-client",
    files: ["src/lib/api-client.ts", "src/lib/api-error.ts"],
    rules: {
      "no-restricted-imports": "off",
    },
  },

  {
    name: "elogbook/tests",
    files: ["**/*.test.{ts,tsx}", "e2e/**/*.ts", "src/test/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": "off",
      // Tests construct AxiosError fixtures directly to exercise error mapping.
      "no-restricted-imports": "off",
    },
  },
]);

export default eslintConfig;
