import config from '@defi-notes/config/eslint.config.react.js';

/** @type {import("eslint").Linter.Config} */
export default [
  ...config,
  {
    files: ['**/*.{ts,tsx}'], // Ensure this targets the correct files
    // rules: {
    //   'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    // },
  },
  {
    ignores: ['dist/', 'public/', 'src/components/ui'],
  },
];
