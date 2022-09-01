import Component from '@glimmer/component';
import { LandscapeToken } from 'explorviz-frontend/services/landscape-token';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import AlertifyHandler from 'explorviz-frontend/utils/alertify-handler';
import ENV from 'explorviz-frontend/config/environment';
import Auth from 'explorviz-frontend/services/auth';
import { tracked } from '@glimmer/tracking';

interface ShareLandscapeArgs {
  token: LandscapeToken;
  reload(): void;
}

const { userService } = ENV.backendAddresses;

export default class ShareLandscape extends Component<ShareLandscapeArgs> {
  @service('auth')
  auth!: Auth;

  @tracked
  username: string = '';

  @action
  async grantAccess() {
    try {
      await this.sendModifyAccess(this.args.token.value, this.username, 'grant');
      this.args.token.sharedUsersIds.addObject(this.username);

      AlertifyHandler.showAlertifySuccess(`Access of ${this.username} granted for token ${this.args.token.value}`);
    } catch (e) {
      AlertifyHandler.showAlertifySuccess(e.message);
    }
  }

  @action
  async revokeAccess(userId: string) {
    try {
      await this.sendModifyAccess(this.args.token.value, userId, 'revoke');
      this.args.token.sharedUsersIds.removeObject(userId);
      AlertifyHandler.showAlertifySuccess(`Access of ${userId} revoked for token ${this.args.token.value}`);
    } catch (e) {
      AlertifyHandler.showAlertifySuccess(e.message);
    }
  }

  @action
  async cloneToken(userId: string) {
    try {
      await this.sendModifyAccess(this.args.token.value, userId, 'clone');
      this.args.reload();
      AlertifyHandler.showAlertifySuccess(`Cloned token ${this.args.token.value}`);
    } catch (e) {
      AlertifyHandler.showAlertifySuccess(e.message);
    }
  }

  sendModifyAccess(tokenId: string, userId: string, method: string) {
    return new Promise<undefined>((resolve, reject) => {
      const encodedUserId = encodeURI(userId);

      fetch(`${userService}/token/${tokenId}/${encodedUserId}?method=${method}`, {
        headers: {
          Authorization: `Bearer ${this.auth.accessToken}`,
        },
        method: 'POST',
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
