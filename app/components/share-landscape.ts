import Component from '@glimmer/component';
import { LandscapeToken } from 'explorviz-frontend/services/landscape-token';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import ENV from 'explorviz-frontend/config/environment';
import Auth from 'explorviz-frontend/services/auth';
import { tracked } from '@glimmer/tracking';
import ToastHandlerService from 'explorviz-frontend/services/toast-handler';

interface ShareLandscapeArgs {
  token: LandscapeToken;
  reload(): void;
}

const { userService } = ENV.backendAddresses;

export default class ShareLandscape extends Component<ShareLandscapeArgs> {
  @service('auth')
  auth!: Auth;

  @service('toastHandler')
  toastHandlerService!: ToastHandlerService;

  focusedClicks = 0;

  @tracked
  username: string = '';

  @action
  async grantAccess() {
    try {
      await this.sendModifyAccess(
        this.args.token.value,
        this.username,
        'grant'
      );
      this.args.token.sharedUsersIds.addObject(this.username);

      this.toastHandlerService.showSuccessToastMessage(
        `Access of ${this.username} granted for token ${this.args.token.value}`
      );
    } catch (e) {
      this.toastHandlerService.showErrorToastMessage(e.message);
    }
  }

  @action
  async revokeAccess(userId: string) {
    try {
      await this.sendModifyAccess(this.args.token.value, userId, 'revoke');
      this.args.token.sharedUsersIds.removeObject(userId);
      this.toastHandlerService.showSuccessToastMessage(
        `Access of ${userId} revoked for token ${this.args.token.value}`
      );
    } catch (e) {
      this.toastHandlerService.showErrorToastMessage(e.message);
    }
  }

  @action
  async cloneToken(userId: string) {
    try {
      await this.sendModifyAccess(this.args.token.value, userId, 'clone');
      this.args.reload();
      this.toastHandlerService.showSuccessToastMessage(
        `Cloned token ${this.args.token.value}`
      );
    } catch (e) {
      this.toastHandlerService.showErrorToastMessage(e.message);
    }
  }

  @action
  hidePopover(event: Event) {
    // Clicks enable us to differentiate between opened and closed popovers
    if (this.focusedClicks % 2 === 1) {
      event.target?.dispatchEvent(new Event('click'));
    }
    this.focusedClicks = 0;
  }

  @action
  onClick(event: Event) {
    this.focusedClicks += 1;
    // Prevent click on table row which would trigger to open the visualization
    event.stopPropagation();
  }

  sendModifyAccess(tokenId: string, userId: string, method: string) {
    return new Promise<undefined>((resolve, reject) => {
      const encodedUserId = encodeURI(userId);

      fetch(
        `${userService}/token/${tokenId}/${encodedUserId}?method=${method}`,
        {
          headers: {
            Authorization: `Bearer ${this.auth.accessToken}`,
          },
          method: 'POST',
        }
      )
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
