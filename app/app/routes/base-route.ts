import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import Auth from 'explorviz-frontend/services/auth';
import { useToastHandlerStore } from 'react-lib/src/stores/toast-handler';

export default class BaseRoute extends Route {
  @service
  auth!: Auth;

  async beforeModel() {
    // this is where we check if a user is authenticated
    // if not authenticated, kick them to the home page
    return this.auth.checkLogin();
  }
  @action
  error(error: unknown) {
    if (error) {
      useToastHandlerStore
        .getState()
        .showErrorToastMessage('An unknown error occured');
    }
  }
}
