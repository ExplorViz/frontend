import Component from '@glimmer/component';

import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import Auth from 'explorviz-frontend/services/auth';
import ToastHandlerService from 'explorviz-frontend/services/toast-handler';
import { SnapshotToken } from 'explorviz-frontend/services/snapshot-token';
import ENV from 'explorviz-frontend/config/environment';

const { userServiceApi } = ENV.backendAddresses;

export default class DeleteSnapshotComponent extends Component<SnapshotToken> {
  @service('auth')
  auth!: Auth;

  @service('router')
  router!: any;

  @service('toast-handler')
  toastHandlerService!: ToastHandlerService;

  /**
   * TODO: async function to delete Snapshot -> DB call in snapshotservice !
   */
  @action
  async deleteSnapshot(snapShot: SnapshotToken) {
    const url = `${userServiceApi}/snapshot/delete?owner=${snapShot.owner}&createdAt=${snapShot.createdAt}`;

    await fetch(url, {
      method: 'DELETE',
    })
      .then(async (response: Response) => {
        if (response.ok) {
          this.toastHandlerService.showSuccessToastMessage(
            'Successfully deleted snapshot.'
          );
        } else {
          this.toastHandlerService.showErrorToastMessage(
            'Something went wrong. Snapshot could not be deleted.'
          );
        }
      })
      .catch(async () => {
        this.toastHandlerService.showErrorToastMessage(
          'Server could not be reached.'
        );
      });

    this.router.refresh('landscapes');
    // console.log('Delete' + snapShot.name);
    // this.toastHandlerService.showSuccessToastMessage(
    //   'Snapshot successfully deleted'
    // );
  }
}
