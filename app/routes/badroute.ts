import Route from '@ember/routing/route';

/**
 * TODO
 *
 * @class Badroute-Route
 * @extends Ember.Route
 */
export default class Badroute extends Route {
  redirect() {
    this.replaceWith('index');
  }
}
