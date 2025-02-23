module.exports = {
  singleQuote: true,
  trailingComma: 'es5',
  printWidth: 80,
  plugins: ['prettier-plugin-ember-template-tag'],
  overrides: [
    {
      files: '*.{js,ts,jsx,tsx}',
      options: {
        singleQuote: true,
      },
    },
  ],
};
