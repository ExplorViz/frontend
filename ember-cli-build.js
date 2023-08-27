/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

const { Webpack } = require('@embroider/webpack');
const EmberApp = require('ember-cli/lib/broccoli/ember-app');
const sass = require('sass');

module.exports = (defaults) => {
  let app = new EmberApp(defaults, {
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

    svgJar: {
      sourceDirs: [
        'public', // default SVGJar lookup directory
        'node_modules/@primer/octicons/build/svg',
      ],
    },
  });

  app.import('node_modules/three/build/three.min.js', {
    prepend: true,
  });

  app.import('vendor/threex/threex.rendererstats.min.js');
  app.import('vendor/threex/threex.dynamictexture.min.js');

  app.import('node_modules/alertifyjs/build/css/alertify.min.css');
  app.import('node_modules/alertifyjs/build/css/themes/default.min.css');

  app.import('vendor/eventsource-polyfill/eventsource.min.js');

  //app.import('node_modules/@popperjs/core/dist/umd/popper.min.js');
  //app.import('node_modules/bootstrap/dist/js/bootstrap.min.js');

  // Bundle is necessary for "Color Presets" Dropdown
  // Separated imports as shown above do not work
  app.import('node_modules/bootstrap/dist/js/bootstrap.bundle.min.js');

  app.import('node_modules/auth0-js/dist/auth0.js');

  app.import('node_modules/crypto-js/crypto-js.js');

  //app.import('node_modules/webxr-polyfill/build/webxr-polyfill.min.js');

  //return app.toTree();
  return require('@embroider/compat').compatBuild(app, Webpack);
};
