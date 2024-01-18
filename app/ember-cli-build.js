/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

const { Webpack } = require('@embroider/webpack');
const EmberApp = require('ember-cli/lib/broccoli/ember-app');
const sass = require('sass');
const BundleAnalyzerPlugin =
  require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const path = require('path');

const environment = EmberApp.env();
const IS_PROD = environment === 'production';
const IS_TEST = environment === 'test';

module.exports = (defaults) => {
  let app = new EmberApp(defaults, {
    hinting: IS_TEST,
    tests: IS_TEST,
    sassOptions: {
      implementation: sass,
      includePaths: [
        'lib/collaborative-mode/addon/styles',
        'lib/virtual-reality/addon/styles',
        'lib/heatmap/addon/styles',
      ],
    },

    'ember-cli-babel': {
      enableTypeScriptTransform: true,
    },

    'ember-bootstrap': {
      bootstrapVersion: 4,
      importBootstrapCSS: false,
    },

    autoprefixer: {
      sourcemap: false,
    },

    sourcemaps: {
      enabled: IS_PROD,
    },

    svgJar: {
      sourceDirs: ['node_modules/@primer/octicons/build/svg'],
    },
  });

  //app.import('node_modules/three/build/three.min.js', {
  //  prepend: true,
  //});

  app.import('vendor/threex/threex.rendererstats.min.js');

  app.import('node_modules/alertifyjs/build/css/alertify.min.css');
  app.import('node_modules/alertifyjs/build/css/themes/default.min.css');

  //app.import('node_modules/@popperjs/core/dist/umd/popper.min.js');
  //app.import('node_modules/bootstrap/dist/js/bootstrap.min.js');

  // Bundle is necessary for "Color Presets" Dropdown
  // Separated imports as shown above do not work
  app.import('node_modules/bootstrap/dist/js/bootstrap.bundle.min.js');

  //app.import('node_modules/auth0-js/dist/auth0.js');

  //app.import('node_modules/crypto-js/crypto-js.js');

  //return app.toTree();
  return require('@embroider/compat').compatBuild(app, Webpack, {
    staticAddonTestSupportTrees: true,
    staticAddonTrees: true,
    staticHelpers: true,
    staticModifiers: true,
    staticComponents: true,
    packagerOptions: {
      webpackConfig: {
        module: {
          rules: [
            {
              test: /\.tsx/,
              use: {
                loader: 'babel-loader',
                options: {
                  presets: [
                    ['@babel/preset-react', { runtime: 'automatic' }],
                    '@babel/preset-typescript',
                  ],
                },
              },
            },
          ],
        },
        plugins: [
          new BundleAnalyzerPlugin({
            generateStatsFile: true,
            openAnalyzer: false,
            statsFilename: path.join(
              process.cwd(),
              'concat-stats-for',
              'my-stats.json'
            ),
          }),
        ],
      },
    },
  });
};
