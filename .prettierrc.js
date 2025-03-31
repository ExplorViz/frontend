const config = {
  singleQuote: true,
  trailingComma: 'es5',
  printWidth: 80,
  overrides: [
    {
      files: '*.{js,ts,jsx,tsx}',
      options: {
        singleQuote: true,
      },
    },
  ],
};

export default config;