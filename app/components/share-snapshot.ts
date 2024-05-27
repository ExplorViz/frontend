import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import ToastHandlerService from 'explorviz-frontend/services/toast-handler';
import Auth from 'explorviz-frontend/services/auth';
import SnapshotTokenService, {
  SnapshotToken,
} from 'explorviz-frontend/services/snapshot-token';
// import ENV from 'explorviz-frontend/config/environment';
/**
 * TODO: website must reload to show snapshot in right table
 * TODO: Button not only share, also revoke access or something like that
 */

// const url = ENV.shareSnapshotURL;
export default class ShareSnapshotComponent extends Component<SnapshotToken> {
  @service('auth')
  auth!: Auth;

  @service('snapshot-token')
  snapshotService!: SnapshotTokenService;

  @service('toast-handler')
  toastHandlerService!: ToastHandlerService;

  // this needs to be async to make DB call
  /**
   * TODO: create URL and edit DB entry
   */
  @action
  async shareSnapshot(snapshot: SnapshotToken) {
    this.snapshotService.shareSnapshot(snapshot);
  }
}
