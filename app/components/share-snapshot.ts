import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import ToastHandlerService from 'explorviz-frontend/services/toast-handler';
import Auth from 'explorviz-frontend/services/auth';
import SnapshotTokenService, {
  SnapshotToken,
} from 'explorviz-frontend/services/snapshot-token';
import { tracked } from '@glimmer/tracking';
import convertDate from 'explorviz-frontend/utils/helpers/time-convter';
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

  @tracked
  setExpireDateMenu: boolean = false;

  @tracked
  expDate: number | null = null;

  @action
  openMenu() {
    this.setExpireDateMenu = true;
  }

  @action
  closeMenu() {
    this.setExpireDateMenu = false;
    this.expDate = null;
  }

  @action
  updateExpDate(event: InputEvent) {
    const target: HTMLInputElement = event.target as HTMLInputElement;
    const date = convertDate(target.value);
    this.expDate = date;
  }

  @action
  async shareSnapshot(snapshot: SnapshotToken) {
    this.snapshotService.shareSnapshot(snapshot);
  }
}
