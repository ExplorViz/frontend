import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import ToastHandlerService from 'explorviz-frontend/services/toast-handler';
import Auth from 'explorviz-frontend/services/auth';
import { SnapshotToken } from 'explorviz-frontend/services/snapshot-token';

/**
 * TODO: website must reload to show snapshot in right table
 * TODO: Button not only share, also revoke access or something like that
 */
export default class ShareSnapshotComponent extends Component<SnapshotToken> {
  @service('auth')
  auth!: Auth;

  @service('toast-handler')
  toastHandlerService!: ToastHandlerService;

  // this needs to be async to make DB call
  /**
   * TODO: create URL and edit DB entry
   */
  @action
  async shareSnapshot(snapShot: SnapshotToken) {
    await navigator.clipboard.writeText(snapShot.landscapeToken.value);
    this.toastHandlerService.showSuccessToastMessage(
      'URL to share snapshot copied to clipboard'
    );
  }
}
