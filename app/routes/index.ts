import Route from '@ember/routing/route';

/**
 * TODO
 *
 * @class Index-Route
 * @extends Ember.Route
 */
export default class IndexRoute extends Route {
  beforeModel(transition: any) {
    super.beforeModel(transition);
    this.replaceWith('login');
  }
}
