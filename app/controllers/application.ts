import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import Auth from 'explorviz-frontend/services/auth';

/**
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
  tokenId = '';
  queryParams = ['landscapeToken', 'createdAt', 'owner'];

  @tracked
  landscapeToken?: string;

  @tracked
  createdAt?: number | null;

  @tracked
  owner?: string | null;
}

// DO NOT DELETE: this is how TypeScript knows how to look up your controllers.
declare module '@ember/controller' {
  // tslint:disable-next-line: interface-name
  interface Registry {
    applicationController: ApplicationController;
  }
}
