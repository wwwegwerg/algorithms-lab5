/**
 * @see https://prettier.io/docs/configuration
 * @type {import("prettier").Config}
 */
export default {
  arrowParens: "always",
  printWidth: 80,
  singleQuote: false,
  semi: true,
  trailingComma: "all",
  tabWidth: 2,
  endOfLine: "lf",
  // tailwindFunctions: ["clsx"],
  plugins: [
    "@ianvs/prettier-plugin-sort-imports",
    // "prettier-plugin-tailwindcss",
  ],
  importOrderTypeScriptVersion: "4.4.0",
  importOrderParserPlugins: ["typescript", "jsx"],
  importOrder: [
    "^(react|react-dom)$",
    "^react/",
    "<THIRD_PARTY_MODULES>",
    "^@/(.*)$",
    "^[../]",
    "^[./]",
  ],
  //   tailwindConfig: "./src/index.css",
};
