module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2019,
    requireConfigFile: false,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: [
    'prettier',
    '@typescript-eslint',
    'import',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/errors',
    'plugin:import/typescript',
    'plugin:qunit/recommended',
    'plugin:prettier/recommended',
  ],
  env: {
    browser: true,
    node: true,
  },
  rules: {
    'prettier/prettier': 'error',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-inferrable-types': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/ban-ts-comment': [
      'error',
      { 'ts-ignore': 'allow-with-description' },
    ],
    '@typescript-eslint/type-annotation-spacing': ['error'],
    'linebreak-style': 'off',
    'class-methods-use-this': 'off',
    'import/no-unresolved': 'off',
    '@typescript-eslint/no-this-alias': [
      'error',
      {
        allowDestructuring: true,
        allowedNames: ['self'],
      },
    ],
    'require-yield': 'off',
    'no-plusplus': 'off',
    'import/no-cycle': 'off',
    'prefer-rest-params': 'off',
    'no-param-reassign': ['error', { props: false }],
    'func-names': ['error', 'always', { generators: 'never' }],
  },
  overrides: [
    // node files
    {
      files: [
        'config/**/*.js',
        'lib/*/index.js',
      ],
      parserOptions: {
        sourceType: 'script',
        ecmaVersion: 2015,
      },
      env: {
        browser: false,
        node: true,
      },
    },
  ],
};
