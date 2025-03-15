import Controller from '@ember/controller';
import { action } from '@ember/object';
import { useLandscapeTokenStore, LandscapeToken } from 'react-lib/src/stores/landscape-token';
import { inject as service } from '@ember/service';
import ENV from 'explorviz-frontend/config/environment';
import { tracked } from '@glimmer/tracking';
import SnapshotTokenService, {
  TinySnapshot,
} from 'explorviz-frontend/services/snapshot-token';
import { useSnapshotTokenStore } from 'react-lib/src/stores/snapshot-token';
import { useToastHandlerStore } from 'react-lib/src/stores/toast-handler';
import { useAuthStore } from 'react-lib/src/stores/auth';

const { userService } = ENV.backendAddresses;

export default class Landscapes extends Controller {
  @service('snapshot-token')
  snapShotTokenService!: SnapshotTokenService;

  @service('router')
  router!: any;

  @tracked
  tokenCreationModalIsOpen: boolean = false;

  @tracked
  tokenAlias: string = '';

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
    useLandscapeTokenStore.getState().setToken(token);
    this.snapShotTokenService.latestSnapshotToken = null;
    this.router.transitionTo('visualization', {
      queryParams: { landscapeToken: token.value },
    });
  }

  @action
  selectPersonalSnapshot(token: TinySnapshot) {
    this.snapShotTokenService.setToken(null);
    this.snapShotTokenService.snapshotSelected = true;
    useLandscapeTokenStore.getState().setToken(null);
    this.router.transitionTo('visualization', {
      queryParams: {
        landscapeToken: token.landscapeToken.value,
        sharedSnapshot: false,
        owner: token.owner,
        createdAt: token.createdAt,
      },
    });
  }

  @action
  selectSharedSnapshot(token: TinySnapshot) {
    // this.snapShotTokenService.setToken(null);
    this.snapShotTokenService.snapshotSelected = true;
    useLandscapeTokenStore.getState().setToken(null);
    this.router.transitionTo('visualization', {
      queryParams: {
        landscapeToken: token.landscapeToken.value,
        sharedSnapshot: true,
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
      useToastHandlerStore
        .getState()
        .showSuccessToastMessage(`Token created: ${token.value}`);
      this.send('refreshRoute');
    } catch (e) {
      useToastHandlerStore.getState().showErrorToastMessage(e.message);
    }
  }

  @action
  async deleteToken(tokenId: string, event: MouseEvent) {
    // Avoid triggering selectToken() on underlying table row
    event.stopPropagation();

    try {
      await this.sendTokenDeleteRequest(tokenId);
      useToastHandlerStore
        .getState()
        .showSuccessToastMessage('Token successfully deleted');
    } catch (e) {
      useToastHandlerStore.getState().showErrorToastMessage(e.message);
    }
    if (useLandscapeTokenStore.getState().token?.value === tokenId) {
      useLandscapeTokenStore.getState().removeToken();
    }
    this.send('refreshRoute');
  }

  sendTokenCreateRequest(alias = '') {
    let uId = useAuthStore.getState().user?.sub.toString();

    if (!uId) {
      return Promise.reject(new Error('User profile not set'));
    }

    uId = encodeURI(uId);

    return new Promise<any>((resolve, reject) => {
      fetch(`${userService}/user/${uId}/token`, {
        headers: {
          Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
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
          Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
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
