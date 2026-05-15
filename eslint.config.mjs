import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextVitals,
  {
    ignores: [
      ".next/**",
      "coverage/**",
      "node_modules/**",
      "src/generated/prisma/**"
    ]
  }
];

export default eslintConfig;
