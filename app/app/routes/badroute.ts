import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

/**
 * TODO
 *
 * @class Badroute-Route
 * @extends Ember.Route
 */
export default class Badroute extends Route {
  @service('router')
  router!: any;

  redirect() {
    this.router.replaceWith('index');
  }
}
