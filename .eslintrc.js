module.exports = {
  env: {
    es6: false,
    node: true,
  },
  extends: [
    "airbnb-base"
  ],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parserOptions: {
    ecmaVersion: 2015,
  },
  rules: {
    "no-async-promise-executor": "off",
    "no-misleading-character-class": "off",
    "no-prototype-builtins": "off",
    "no-shadow-restricted-names": "off",
    "no-useless-catch": "off",
    "no-with": "off",
    "require-atomic-updates": "off",
    "no-console": "error",
    "prefer-template": "off",
    "quotes": ["error", "single", { "allowTemplateLiterals": false }]
  },
};
