import Component from '@glimmer/component';
import { LandscapeToken } from 'react-lib/src/stores/landscape-token';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { useToastHandlerStore } from 'react-lib/src/stores/toast-handler';
import { useAuthStore } from 'react-lib/src/stores/auth';

interface ShareLandscapeArgs {
  token: LandscapeToken;
  reload(): void;
}

const { userService } = import.meta.env.VITE_BACKEND_ADDRESSES;

export default class ShareLandscape extends Component<ShareLandscapeArgs> {
  user = useAuthStore.getState().user;
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

      useToastHandlerStore
        .getState()
        .showSuccessToastMessage(
          `Access of ${this.username} granted for token ${this.args.token.value}`
        );
    } catch (e) {
      useToastHandlerStore.getState().showErrorToastMessage(e.message);
    }
  }

  @action
  async revokeAccess(userId: string) {
    try {
      await this.sendModifyAccess(this.args.token.value, userId, 'revoke');
      this.args.token.sharedUsersIds.removeObject(userId);
      useToastHandlerStore
        .getState()
        .showSuccessToastMessage(
          `Access of ${userId} revoked for token ${this.args.token.value}`
        );
    } catch (e) {
      useToastHandlerStore.getState().showErrorToastMessage(e.message);
    }
  }

  @action
  async cloneToken(userId: string) {
    try {
      await this.sendModifyAccess(this.args.token.value, userId, 'clone');
      this.args.reload();
      useToastHandlerStore
        .getState()
        .showSuccessToastMessage(`Cloned token ${this.args.token.value}`);
    } catch (e) {
      useToastHandlerStore.getState().showErrorToastMessage(e.message);
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
            Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
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

return (

  <div id='colorPresets' class='dropdown'>
  <button
  class='button-svg-with-hover'
    type='button'
    {{on 'focusout' this.hidePopover}}
    {{on 'click' this.onClick}}
  >
  {{svg-jar 'share-android-16' class='octicon align-middle'}}
  <BsTooltip @placement='bottom' @triggerEvents='hover'>
      Manage access to token
      </BsTooltip>
      <BsPopover @title='Manage Access'>
      <table class='table table-striped' style='width: 100%'>
      <tbody>
          {{#if (eq @token.ownerId this.user.sub)}}
          {{#each @token.sharedUsersIds as |userWithAccess|}}
              <tr class='d-flex'>
              <td class='col-10'>{{userWithAccess}}</td>
                <td class='col-2'>
                  <button
                  class='button-svg-with-hover'
                    type='button'
                    {{on 'click' (fn this.revokeAccess userWithAccess)}}
                  >
                  {{svg-jar 'dash-16' class='octicon align-middle'}}
                    <BsTooltip @placement='bottom' @triggerEvents='hover'>
                    Revoke access
                    </BsTooltip>
                  </button>
                </td>
                </tr>
            {{/each}}
            <tr class='d-flex'>
              <td class='col-10'>
                <label for='username'>Enter username</label>
                <Input
                  id='username'
                  @value={{this.username}}
                  placeholder='github|12345'
                />
              </td>
              <td class='col-2'>
              <button
                  class='button-svg-with-hover'
                  type='button'
                  {{on 'click' this.grantAccess}}
                  >
                  {{svg-jar 'plus-16' class='octicon align-middle'}}
                  <BsTooltip @placement='bottom' @triggerEvents='hover'>
                    Grant access
                  </BsTooltip>
                  </button>
              </td>
            </tr>
          {{else}}
            <tr class='d-flex'>
              <td class='col-10'>Revoke own access</td>
              <td class='col-2'>
              <button
                  class='button-svg-with-hover'
                  type='button'
                  {{on 'click' (fn this.revokeAccess this.user.sub)}}
                >
                {{svg-jar 'trash-16' class='octicon align-middle'}}
                  <BsTooltip @placement='bottom' @triggerEvents='hover'>
                    Revoke own access
                  </BsTooltip>
                </button>
              </td>
            </tr>
            <tr class='d-flex'>
            <td class='col-10'>Clone token</td>
              <td class='col-2'>
                <button
                  class='button-svg-with-hover'
                  type='button'
                  {{on 'click' (fn this.cloneToken this.user.sub)}}
                >
                  {{svg-jar 'repo-forked-16' class='octicon align-middle'}}
                  <BsTooltip @placement='bottom' @triggerEvents='hover'>
                    Clone token to gain write access
                  </BsTooltip>
                </button>
              </td>
            </tr>
          {{/if}}
        </tbody>
      </table>
      </BsPopover>
      </button>
      </div>
  )
};