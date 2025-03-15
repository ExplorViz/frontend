import Route from '@ember/routing/route';
import { action } from '@ember/object';
import { useToastHandlerStore } from 'react-lib/src/stores/toast-handler';

export default class BaseRoute extends Route {
  async beforeModel() {
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
