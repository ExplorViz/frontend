/* eslint-disable @typescript-eslint/no-var-requires */
const mergeTrees = require('broccoli-merge-trees');
const Funnel = require('broccoli-funnel');

module.exports = {
  name: 'virtual-reality',

  isDevelopingAddon() {
    return true;
  },

  options: {
    'ember-cli-babel': {
      enableTypeScriptTransform: true,
    },
  },

  included() {
    // eslint-disable-next-line no-underscore-dangle
    return this._super.included.apply(this, arguments);
  },

  treeForPublic(tree) {
    const assetsTree = new Funnel('public');
    return mergeTrees([tree, assetsTree], {
      overwrite: true,
    });
  },
};
