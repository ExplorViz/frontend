import { inject as service } from '@ember/service';
import LandscapeTokenService from 'explorviz-frontend/services/landscape-token';
import ENV from 'explorviz-frontend/config/environment';
import { action } from '@ember/object';
import BaseRoute from './base-route';

const { tokenToShow } = ENV.mode;

export default class Landscapes extends BaseRoute {
  @service('landscape-token')
  tokenService!: LandscapeTokenService;

  @service('router')
  router!: any;

  @action
  refreshRoute() {
    return this.refresh();
  }

  async model() {
    if (tokenToShow && tokenToShow !== 'change-token') {
      this.router.transitionTo('visualization');
    }

    return this.tokenService.retrieveTokens();
  }

  @action
  // eslint-disable-next-line class-methods-use-this
  loading(/* transition, originRoute */) {
    return true;
  }
}
