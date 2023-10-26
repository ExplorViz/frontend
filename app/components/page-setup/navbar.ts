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
    if (this.router.currentRouteName === 'landscapes') {
      this.tokenService.setToken(this.tokenService.latestToken!);
      this.router.transitionTo('visualization');
    } else {
      this.router.transitionTo('landscapes');
    }
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
