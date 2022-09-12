module.exports = {
  name: 'collaborative-mode',

  isDevelopingAddon() {
    return true;
  },

  included(app, parentAddon) {
    const target = parentAddon || app;
    target.options = target.options || {};
    target.options.babel = target.options.babel || { includePolyfill: true };
    // eslint-disable-next-line no-underscore-dangle
    return this._super.included.apply(this, arguments);
  },
};
