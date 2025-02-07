import Application from '@ember/application';
import loadInitializers from 'ember-load-initializers';
import config from 'explorviz-frontend/config/environment';
import Resolver from 'explorviz-frontend/resolver';

/**
 * Ember application is the starting point for every Ember application.
 *
 * @class Application
 * @extends Ember.Application
 *
 * @module ember
 */
export default class App extends Application {
  modulePrefix = config.modulePrefix;

  podModulePrefix = config.podModulePrefix;

  Resolver = Resolver;
}

loadInitializers(App, config.modulePrefix);
