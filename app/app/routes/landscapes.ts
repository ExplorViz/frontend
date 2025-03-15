import { inject as service } from '@ember/service';
import { useLandscapeTokenStore } from 'react-lib/src/stores/landscape-token';
import ENV from 'explorviz-frontend/config/environment';
import { action } from '@ember/object';
import BaseRoute from './base-route';
import SnapshotTokenService from 'explorviz-frontend/services/snapshot-token';
import Ember from 'ember';

const { tokenToShow } = ENV.mode;

export default class Landscapes extends BaseRoute {
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
      landscapeTokens: useLandscapeTokenStore.getState().retrieveTokens(),
      snapshotInfo: this.snapshotService.retrieveTokens(),
    });
  }

  @action
  // eslint-disable-next-line class-methods-use-this
  loading(/* transition, originRoute */) {
    return true;
  }
}
