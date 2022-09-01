import { inject as service } from '@ember/service';
import LandscapeTokenService, { LandscapeToken } from 'explorviz-frontend/services/landscape-token';
import ENV from 'explorviz-frontend/config/environment';
import { action } from '@ember/object';
import BaseRoute from './base-route';

const { userService } = ENV.backendAddresses;

export default class Landscapes extends BaseRoute {
  @service('landscape-token')
  tokenService!: LandscapeTokenService;

  @action
  refreshRoute() {
    return this.refresh();
  }

  async model() {
    let uId = this.auth.user?.sub;

    if (!uId) {
      return Promise.reject(new Error('User profile not set'));
    }

    uId = encodeURI(uId);

    return new Promise<any>((resolve, reject) => {
      fetch(`${userService}/user/${uId}/token`, {
        headers: {
          Authorization: `Bearer ${this.auth.accessToken}`,
        },
      })
        .then(async (response: Response) => {
          if (response.ok) {
            const tokens = await response.json() as LandscapeToken[];
            resolve(tokens);
          } else {
            reject();
          }
        })
        .catch((e) => reject(e));
    });
  }

  afterModel(landscapeTokens: LandscapeToken[]) {
    const currentToken = this.tokenService.token;
    const tokenCandidates = landscapeTokens.filter((token) => token.value === currentToken?.value);
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
