import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import Auth from 'explorviz-frontend/services/auth';
import { tracked } from '@glimmer/tracking';

/**
 * TODO
 *
 * @class Application-Controller
 * @extends Ember.Controller
 *
 * @module explorviz
 * @submodule page
 */
export default class ApplicationController extends Controller {
  @service('auth') auth!: Auth;

  @tracked
  queryParams = ['lsToken', 'deviceId', 'roomId'];
  @tracked
  lsToken = '';
  @tracked
  deviceId = -1;
  @tracked
  roomId = '';
}

// DO NOT DELETE: this is how TypeScript knows how to look up your controllers.
declare module '@ember/controller' {
  // tslint:disable-next-line: interface-name
  interface Registry {
    applicationController: ApplicationController;
  }
}
