import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { Auth0Error } from 'auth0-js';
import Auth from 'explorviz-frontend/services/auth';
import AlertifyHandler from 'explorviz-frontend/utils/alertify-handler';

export default class BaseRoute extends Route {
  @service
  auth!: Auth;

  async beforeModel() {
    // this is where we check if a user is authenticated
    // if not authenticated, kick them to the home page
    return this.auth.checkLogin();
  }

  @action
  error(error: Auth0Error) {
    if (error.description) {
      AlertifyHandler.showAlertifyWarning(error.description);
    }
    if (error.statusCode !== 429) {
      this.auth.logout();
    }
    return true;
  }
}
