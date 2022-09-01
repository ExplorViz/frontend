import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import Auth from 'explorviz-frontend/services/auth';
import config from 'explorviz-frontend/config/environment';
import Router from 'explorviz-frontend/router';

/**
* TODO
*
* @class Login-Route
* @extends Ember.Route
*/
export default class LoginRoute extends Route {
  @service
  auth!: Auth;

  @service
  router! : Router;

  afterModel() {
    this.auth.checkLogin()
      .then(() => this.router.transitionTo(config.auth0.routeAfterLogin))
      .catch(() => this.auth.login());
  }
}
