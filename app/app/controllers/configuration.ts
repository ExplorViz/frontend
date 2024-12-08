import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import Configuration from 'explorviz-frontend/services/configuration';

/**
 * TODO
 *
 * @class ConfigurationController
 * @extends Ember.Controller
 *
 * @module explorviz
 * @submodule settings
 */
export default class ConfigurationController extends Controller {
  // used in template to add extension tabs
  @service('configuration') configurationService!: Configuration;
}

// DO NOT DELETE: this is how TypeScript knows how to look up your controllers.
declare module '@ember/controller' {
  // tslint:disable-next-line: interface-name
  interface Registry {
    configurationController: ConfigurationController;
  }
}
