import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import LandscapeTokenService from 'explorviz-frontend/services/landscape-token';
import Auth from 'explorviz-frontend/services/auth';
import ENV from 'explorviz-frontend/config/environment';

export default class Navbar extends Component {
  @service('landscape-token')
  tokenService!: LandscapeTokenService;

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
    this.tokenService.setToken(null);
    this.router.transitionTo('landscapes', {
      queryParams: { landscapeToken: undefined },
    });
  }

  @action
  goToVisualization() {
    this.tokenService.setToken(this.tokenService.latestToken!);
    this.router.transitionTo('visualization', {
      queryParams: {
        landscapeToken: this.tokenService.latestToken!.value,
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
