import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import LandscapeTokenService from 'explorviz-frontend/services/landscape-token';
import Auth from 'explorviz-frontend/services/auth';
import ENV from 'explorviz-frontend/config/environment';
import RenderingService from 'explorviz-frontend/services/rendering-service';

export default class Navbar extends Component {
  @service('landscape-token')
  tokenService!: LandscapeTokenService;

  @service('router')
  router!: any;

  @service('auth')
  auth!: Auth;

  @service('rendering-service')
  renderingService!: RenderingService;

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

  get renderingMode() {
    let currentRenderingMode = this.renderingService.visualizationMode;

    currentRenderingMode =
      'Active mode: ' +
      currentRenderingMode.charAt(0).toUpperCase() +
      currentRenderingMode.slice(1);

    return currentRenderingMode;
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
