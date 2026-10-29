import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextVitals,
  {
    // Keep the owner's supplied component byte-for-byte; integration code remains linted.
    files: ["src/components/PortfolioBuilder.jsx"],
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react/no-unescaped-entities": "off",
      "@next/next/no-img-element": "off"
    }
  },
  {
    ignores: [".next/**", "node_modules/**", "src/generated/**"]
  }
];

export default eslintConfig;
