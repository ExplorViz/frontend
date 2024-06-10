import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import LandscapeTokenService from 'explorviz-frontend/services/landscape-token';
import Auth from 'explorviz-frontend/services/auth';
import ENV from 'explorviz-frontend/config/environment';
import SnapshotTokenService from 'explorviz-frontend/services/snapshot-token';

export default class Navbar extends Component {
  @service('landscape-token')
  tokenService!: LandscapeTokenService;

  @service('snapshot-token')
  snapshotService!: SnapshotTokenService;

  @service('router')
  router!: any;

  @service('auth')
  auth!: Auth;

  @action
  logout() {
    this.auth.logout();
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
      this.tokenService.setToken(this.tokenService.latestToken!);
      this.router.transitionTo('visualization', {
        queryParams: {
          landscapeToken: this.tokenService.latestToken!.value,
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

  get isSingleLandscapeMode() {
    return (
      ENV.mode.tokenToShow.length > 0 && ENV.mode.tokenToShow !== 'change-token'
    );
  }

  get versionTag() {
    return ENV.version.versionTag;
  }
}
