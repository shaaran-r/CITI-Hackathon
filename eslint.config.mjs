import eslintConfigPrettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.expo/**',
      '**/.next/**',
      '**/.next-review-build/**',
      '**/coverage/**',
    ],
  },
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
);
