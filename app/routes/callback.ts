import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import Router from '@ember/routing/router';

/**
 * TODO
 *
 * @class Callback-Route
 * @extends Ember.Route
 */
export default class Callback extends Route {
  @service
  router!: Router;

  async afterModel() {
    this.router.transitionTo('landscapes');
  }
}
