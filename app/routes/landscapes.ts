import { inject as service } from '@ember/service';
import LandscapeTokenService, {
  LandscapeToken,
} from 'explorviz-frontend/services/landscape-token';
import ENV from 'explorviz-frontend/config/environment';
import { action } from '@ember/object';
import BaseRoute from './base-route';
import SnapshotTokenService, {
  SnapshotInfo,
} from 'explorviz-frontend/services/snapshot-token';
import Ember from 'ember';

const { tokenToShow } = ENV.mode;

export default class Landscapes extends BaseRoute {
  @service('landscape-token')
  tokenService!: LandscapeTokenService;

  @service('snapshot-token')
  snapshotService!: SnapshotTokenService;

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

    return Ember.RSVP.hash({
      landscapeTokens: this.tokenService.retrieveTokens(),
      snapshotInfo: this.snapshotService.retrieveTokens(),
    });
  }

  afterModel(tokens: {
    landscapeTokens: LandscapeToken[];
    snapshotInfo: SnapshotInfo[];
  }) {
    const currentToken = this.tokenService.token;
    const tokenCandidates = tokens.landscapeTokens.filter(
      (token) => token.value === currentToken?.value
    );
    if (tokenCandidates.length > 0) {
      this.tokenService.setToken(tokenCandidates[0]);
    } else {
      // selected token does not exist anymore
      this.tokenService.removeToken();
    }
  }

  @action
  // eslint-disable-next-line class-methods-use-this
  loading(/* transition, originRoute */) {
    return true;
  }
}
