const sass = require('sass');
const EmberApp = require('ember-cli/lib/broccoli/ember-app');

module.exports = (defaults) => {
  const app = new EmberApp(defaults, {
    // Default implementation for ember-cli-sass
    sassOptions: {
      implementation: sass,
      includePaths: ['lib/virtual-reality/addon/styles', 'lib/heatmap/addon/styles'],
    },

    svgJar: {
      sourceDirs: [
        'public', // default SVGJar lookup directory
        'node_modules/@primer/octicons/build/svg',
      ],
    },
    babel: {
      sourceMaps: 'inline',
    },

    'ember-cli-babel': {
      includePolyfill: true,
      sourceMaps: 'inline',
    },

    fingerprint: {
      exclude: ['images'],
    },

    'ember-bootstrap': {
      bootstrapVersion: 4,
      importBootstrapFont: false,
      importBootstrapCSS: false,
    },

    autoImport: {
      webpack: {
        node: {
          global: true,
        },
      },
    },
  });

  // export for threex.dynamictexture
  app.import('node_modules/three/build/three.min.js', {
    prepend: true,
  });

  app.import('vendor/threex/threex.rendererstats.min.js');
  app.import('vendor/threex/threex.dynamictexture.min.js');

  app.import('node_modules/alertifyjs/build/css/alertify.min.css');
  app.import('node_modules/alertifyjs/build/css/themes/default.min.css');

  app.import('node_modules/@ar-js-org/ar.js/three.js/build/ar-threex.js');

  app.import('vendor/cytoscape/cytoscape.min.js');

  app.import('vendor/eventsource-polyfill/eventsource.min.js');

  app.import('node_modules/bootstrap/dist/js/bootstrap.min.js');

  app.import('node_modules/auth0-js/dist/auth0.js');
  app.import('node_modules/bootstrap-colorpicker/dist/css/bootstrap-colorpicker.min.css');
  app.import('node_modules/bootstrap-colorpicker/dist/js/bootstrap-colorpicker.min.js');

  app.import('node_modules/crypto-js/crypto-js.js');

  app.import('node_modules/webxr-polyfill/build/webxr-polyfill.min.js');
  app.import('node_modules/elkjs/lib/elk-api.js');

  return app.toTree();
};
