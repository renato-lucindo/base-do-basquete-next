import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['especificacao/**', 'dist/**', 'node_modules/**'] },
  ...tseslint.configs.recommended,
);
