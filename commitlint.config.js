/** @type {import('@commitlint/types').UserConfig} */
const config = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "refactor",
        "docs",
        "style",
        "test",
        "chore",
        "perf",
        "build",
        "ci",
        "revert",
      ],
    ],
    "subject-case": [2, "never", ["upper-case", "pascal-case", "start-case"]],
    "subject-empty": [2, "never"],
    "header-max-length": [2, "always", 100],
  },
};

module.exports = config;
