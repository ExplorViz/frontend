import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import ToastMessage from 'react-lib/src/components/page-setup/toast-message.tsx';
import { useAuthStore } from 'react-lib/src/stores/auth';

/**
 *
 * @class Application-Controller
 * @extends Ember.Controller
 *
 * @module explorviz
 * @submodule page
 */
export default class ApplicationController extends Controller {
  // React component refs
  toastMessage = ToastMessage;

  user = useAuthStore.getState().user;

  @tracked
  tokenId = '';
  queryParams = ['landscapeToken'];

  @tracked
  landscapeToken?: string;
}

// DO NOT DELETE: this is how TypeScript knows how to look up your controllers.
declare module '@ember/controller' {
  // tslint:disable-next-line: interface-name
  interface Registry {
    applicationController: ApplicationController;
  }
}
