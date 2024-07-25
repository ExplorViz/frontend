module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2019,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint', 'import', 'prettier'],
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
  globals: {
    auth0: false,
  },
  rules: {
    '@typescript-eslint/ban-ts-comment': [
      'error',
      { 'ts-ignore': 'allow-with-description' },
    ],
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-inferrable-types': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/no-this-alias': [
      'error',
      {
        allowDestructuring: true,
        allowedNames: ['self'],
      },
    ],
    '@typescript-eslint/type-annotation-spacing': ['error'],
    'class-methods-use-this': 'off',
    'ember/no-mixins': 'off',
    'ember/require-computed-property-dependencies': 'off',
    'func-names': ['error', 'always', { generators: 'never' }],
    'import/no-cycle': 'off',
    'import/no-unresolved': 'off',
    'linebreak-style': 'off',
    'no-console': ['error', { allow: ['warn', 'error'] }],
    'no-param-reassign': ['error', { props: false }],
    'no-plusplus': 'off',
    'prefer-rest-params': 'off',
    'prettier/prettier': 'error',
    'require-yield': 'off',
  },
  overrides: [
    // node files
    {
      files: [
        'config/**/*.js',
        'ember-cli-build.js',
        'lib/*/index.js',
        'testem.js',
      ],
      parserOptions: {
        ecmaVersion: 2015,
        sourceType: 'script',
      },
      env: {
        browser: false,
        node: true,
      },
    },
  ],
};
