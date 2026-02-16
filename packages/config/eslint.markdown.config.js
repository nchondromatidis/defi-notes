import tseslint from 'typescript-eslint';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import markdown from '@eslint/markdown';

export default tseslint.config([
  {
    files: ['**/*.md', '**/*.mdx'],
    plugins: { markdown },
    language: 'markdown/commonmark',
    extends: [eslintPluginPrettierRecommended],
  },
]);
