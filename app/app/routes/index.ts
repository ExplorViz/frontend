import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

/**
 * TODO
 *
 * @class Index-Route
 * @extends Ember.Route
 */
export default class IndexRoute extends Route {
  @service('router')
  router!: any;

  beforeModel(transition: any) {
    super.beforeModel(transition);
    this.router.replaceWith('login');
  }
}
