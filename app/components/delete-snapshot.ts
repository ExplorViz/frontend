import Component from '@glimmer/component';

import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import Auth from 'explorviz-frontend/services/auth';
import ToastHandlerService from 'explorviz-frontend/services/toast-handler';
import { SnapshotToken } from 'explorviz-frontend/services/snapshot-token';

export default class DeleteSnapshotComponent extends Component<SnapshotToken> {
  @service('auth')
  auth!: Auth;

  @service('toast-handler')
  toastHandlerService!: ToastHandlerService;

  /**
   * TODO: async function to delete Snapshot -> DB call
   */
  @action
  deleteSnapshot(snapShot: SnapshotToken) {
    console.log('Delete' + snapShot.name);
    this.toastHandlerService.showSuccessToastMessage(
      'Snapshot successfully deleted'
    );
  }
}
