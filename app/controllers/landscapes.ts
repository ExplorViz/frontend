import Controller from '@ember/controller';
import { action } from '@ember/object';
import LandscapeTokenService, {
  LandscapeToken,
} from 'explorviz-frontend/services/landscape-token';
import { inject as service } from '@ember/service';
import Auth from 'explorviz-frontend/services/auth';
import ToastHandlerService from 'explorviz-frontend/services/toast-handler';
import ENV from 'explorviz-frontend/config/environment';
import { tracked } from '@glimmer/tracking';
import SnapshotTokenService, {
  SnapshotToken,
} from 'explorviz-frontend/services/snapshot-token';

const { userService } = ENV.backendAddresses;

export default class Landscapes extends Controller {
  @service('landscape-token')
  tokenService!: LandscapeTokenService;

  @service('snapshot-token')
  snapShotTokenService!: SnapshotTokenService;

  @service('router')
  router!: any;

  @service('auth')
  auth!: Auth;

  @tracked
  tokenCreationModalIsOpen: boolean = false;

  @tracked
  tokenAlias: string = '';

  @service('toast-handler')
  toastHandlerService!: ToastHandlerService;

  @action
  openTokenCreationModal() {
    this.tokenCreationModalIsOpen = true;
    this.tokenAlias = '';
  }

  @action
  closeTokenCreationModal() {
    this.tokenCreationModalIsOpen = false;
    this.tokenAlias = '';
  }

  @action
  selectToken(token: LandscapeToken) {
    this.tokenService.setToken(token);
    this.router.transitionTo('visualization', {
      queryParams: { landscapeToken: token.value },
    });
  }

  /**
   * TODO: update to load the highlighting as well
   */
  @action
  async selectSnapshot(token: SnapshotToken) {
    this.tokenService.setToken(token.landscapeToken);
    this.router.transitionTo('visualization', {
      queryParams: {
        landscapeToken: token.landscapeToken.value,
        sharedSnapshot: token.isShared,
        owner: token.owner,
        createdAt: token.createdAt,
      },
    });
  }

  @action
  async createToken() {
    try {
      const token = await this.sendTokenCreateRequest(this.tokenAlias);
      this.closeTokenCreationModal();
      this.toastHandlerService.showSuccessToastMessage(
        `Token created: ${token.value}`
      );
      this.send('refreshRoute');
    } catch (e) {
      this.toastHandlerService.showErrorToastMessage(e.message);
    }
  }

  @action
  async deleteToken(tokenId: string, event: MouseEvent) {
    // Avoid triggering selectToken() on underlying table row
    event.stopPropagation();

    try {
      await this.sendTokenDeleteRequest(tokenId);
      this.toastHandlerService.showSuccessToastMessage(
        'Token successfully deleted'
      );
    } catch (e) {
      this.toastHandlerService.showErrorToastMessage(e.message);
    }
    if (this.tokenService.token?.value === tokenId) {
      this.tokenService.removeToken();
    }
    this.send('refreshRoute');
  }

  sendTokenCreateRequest(alias = '') {
    let uId = this.auth.user?.sub;

    if (!uId) {
      return Promise.reject(new Error('User profile not set'));
    }

    uId = encodeURI(uId);

    return new Promise<any>((resolve, reject) => {
      fetch(`${userService}/user/${uId}/token`, {
        headers: {
          Authorization: `Bearer ${this.auth.accessToken}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({
          alias,
        }),
      })
        .then(async (response: Response) => {
          if (response.ok) {
            const token = await response.json();
            resolve(token);
          } else {
            reject(new Error('Something went wrong'));
          }
        })
        .catch((e) => reject(e));
    });
  }

  @action
  reload() {
    this.send('refreshRoute');
  }

  sendTokenDeleteRequest(tokenId: string) {
    return new Promise<undefined>((resolve, reject) => {
      fetch(`${userService}/token/${tokenId}`, {
        headers: {
          Authorization: `Bearer ${this.auth.accessToken}`,
        },
        method: 'DELETE',
      })
        .then(async (response: Response) => {
          if (response.ok) {
            resolve(undefined);
          } else if (response.status === 404) {
            reject(new Error('Token not found'));
          } else {
            reject(new Error('Something went wrong'));
          }
        })
        .catch((e) => reject(e));
    });
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your controllers.
declare module '@ember/controller' {
  interface Registry {
    landscapes: Landscapes;
  }
}
