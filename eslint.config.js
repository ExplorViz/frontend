import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactDom from 'eslint-plugin-react-dom';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import reactX from 'eslint-plugin-react-x';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// CI treats every enabled rule as an error.
const strictRules = (rules) =>
  Object.fromEntries(
    Object.entries(rules).map(([name, setting]) => {
      const [severity, ...options] = Array.isArray(setting) ? setting : [setting];
      return [name, [severity === 'warn' || severity === 1 ? 'error' : severity, ...options]];
    })
  );

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'public/**', '**/node_modules/**'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        project: ['./tsconfig.eslint.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'react-x': reactX,
      'react-dom': reactDom,
    },
    rules: {
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/type-annotation-spacing': 'off',
      '@typescript-eslint/no-this-alias': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-magic-numbers': 'off',
      '@typescript-eslint/explicit-member-accessibility': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/consistent-type-assertions': 'off',
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/ban-types': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-unsafe-enum-comparison': 'off',
      '@typescript-eslint/restrict-plus-operands': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'off',
      '@typescript-eslint/no-duplicate-type-constituents': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      '@typescript-eslint/no-for-in-array': 'off',
      '@typescript-eslint/prefer-promise-reject-errors': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-wrapper-object-types': 'off',
      '@typescript-eslint/no-base-to-string': 'off',
      'no-unsafe-optional-chaining': 'off',
      'prefer-const': 'off',
      'no-constant-condition': 'off', // because in navbar.tsx line 153 it had to be false, because user.picture is not present right now
      ...strictRules(reactHooks.configs.recommended.rules),
      'react-refresh/only-export-components': ['error', { allowConstantExport: true }],
      ...strictRules(reactX.configs['recommended-typescript'].rules),
      ...strictRules(reactDom.configs.recommended.rules),
      // These effect/dependency policies are intentionally not enforced.
      'react-hooks/exhaustive-deps': 'off',
      'react-x/exhaustive-deps': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-x/set-state-in-effect': 'off',
      'react-x/no-set-state-in-component-did-update': 'off',
    },
  },
  {
    files: ['**/*.{js,jsx}'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  prettier
);
