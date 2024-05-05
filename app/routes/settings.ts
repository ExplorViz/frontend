import UserApiTokenService from 'explorviz-frontend/services/user-api-token';
import BaseRoute from './base-route';
import { inject as service } from '@ember/service';

export default class SettingsRoute extends BaseRoute {
  @service('router')
  router!: any;

  @service('user-api-token')
  userApiTokenService!: UserApiTokenService;

  async model() {
    return this.userApiTokenService.retrieveApiTokens();
  }
}
