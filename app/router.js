import EmberRouter from '@ember/routing/router';
import config from './config/environment';

/**
 * Ember router for mapping "route" and respective "template".
 *
 * @class Router
 * @extends Ember.Router
 *
 * @module ember
 */
const Router = EmberRouter.extend({
  location: config.locationType,
  rootURL: config.rootURL,
  configurationRouteExtensions: null,
});

// eslint-disable-next-line func-names, array-callback-return
Router.map(function () {
  this.route('badroute', { path: '/*path' });
  this.route('login');
  this.route('callback');
  this.route('visualization');
  this.route('landscapes');
  this.route('settings');
});

export default Router;
