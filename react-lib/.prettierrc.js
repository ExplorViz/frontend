module.exports = {
  singleQuote: true,
  trailingComma: 'es5',
  printWidth: 80,
  plugins: ['prettier-plugin-ember-template-tag'],
  overrides: [
    {
      files: '*.{js,ts,gjs,gts}',
      options: {
        singleQuote: true,
      },
    },
  ],
};
