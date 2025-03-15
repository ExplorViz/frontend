import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import LandscapeTokenService from 'explorviz-frontend/services/landscape-token';
import ENV from 'explorviz-frontend/config/environment';
import SnapshotTokenService from 'explorviz-frontend/services/snapshot-token';
import RenderingService from 'explorviz-frontend/services/rendering-service';
import { useAuthStore } from 'react-lib/src/stores/auth';

export default class Navbar extends Component {
  @service('landscape-token')
  tokenService!: LandscapeTokenService;

  @service('snapshot-token')
  snapshotService!: SnapshotTokenService;

  @service('router')
  router!: any;

  user = useAuthStore.getState().user;

  @service('rendering-service')
  renderingService!: RenderingService;

  @action
  logout() {
    // useAuthStore.getState().logout(); // TODO: Gibt es nicht mehr
  }

  @action
  goToLandscapeSelection() {
    this.snapshotService.snapshotSelected = false;
    this.tokenService.setToken(null);
    this.snapshotService.setToken(null);
    this.router.transitionTo('landscapes', {
      queryParams: { landscapeToken: undefined },
    });
  }

  @action
  goToVisualization() {
    if (this.snapshotService.latestSnapshotToken !== null) {
      this.snapshotService.setToken(this.snapshotService.latestSnapshotToken);
      this.router.transitionTo('visualization', {
        queryParams: {
          landscapeToken:
            this.snapshotService.latestSnapshotToken.landscapeToken.value,
          sharedSnapshot: this.snapshotService.latestSnapshotToken.isShared,
          owner: this.snapshotService.latestSnapshotToken.owner,
          createdAt: this.snapshotService.latestSnapshotToken.createdAt,
        },
      });
    } else {
      this.router.transitionTo('visualization', {
        queryParams: {
          landscapeToken: this.tokenService.token!.value,
        },
      });
    }
  }

  @action
  goToSettings() {
    this.tokenService.setToken(null);
    this.snapshotService.snapshotSelected = false;
    this.snapshotService.setToken(null);
    this.router.transitionTo('settings', {
      queryParams: {
        landscapeToken: undefined,
      },
    });
  }

  get analysisMode() {
    let currentAnalysisMode = this.renderingService.analysisMode;

    currentAnalysisMode =
      'Active mode: ' +
      currentAnalysisMode.charAt(0).toUpperCase() +
      currentAnalysisMode.slice(1);

    return currentAnalysisMode;
  }

  get isSingleLandscapeMode() {
    return (
      ENV.mode.tokenToShow.length > 0 && ENV.mode.tokenToShow !== 'change-token'
    );
  }

  get versionTag() {
    return ENV.version.versionTag;
  }
}
