import Service, { inject as service } from '@ember/service';
// import { tracked } from '@glimmer/tracking';
import ENV from 'explorviz-frontend/config/environment';
import Auth from './auth';
import ToastHandlerService from './toast-handler';
import { LandscapeToken } from './landscape-token';
import { tracked } from '@glimmer/tracking';
//import { SerializedRoom } from 'collaboration/utils/web-socket-messages/types/serialized-room';

/**
 *  Change julius!
 */
export type SnapshotToken = {
  owner: string;
  createdAt: number;
  name: string;
  landscapeToken: LandscapeToken;
  structureData: any;
  configuration: any;
  camera: any;
  annotations: any;
  isShared: boolean;
  deleteAt: number;
  julius: any;
};

const { userServiceApi } = ENV.backendAddresses;

export default class SnapshotTokenService extends Service {
  @service('auth')
  private auth!: Auth;

  @service('toast-handler')
  toastHandler!: ToastHandlerService;

  @tracked
  snapshotToken: SnapshotToken | null = null;

  retrieveTokens() {
    return new Promise<SnapshotToken[]>((resolve) => {
      const userId = encodeURI(this.auth.user?.sub || '');
      if (!userId) {
        resolve([]);
      }

      fetch(`${userServiceApi}/snapshot?owner=${userId}`, {
        headers: {
          Authorization: `Bearer ${this.auth.accessToken}`,
        },
      })
        .then(async (response: Response) => {
          if (response.ok) {
            const tokens = (await response.json()) as SnapshotToken[];
            resolve(tokens);
          } else {
            resolve([]);
            this.toastHandler.showErrorToastMessage(
              'Snapshots could not be loaded.'
            );
          }
        })
        .catch(async () => {
          resolve([]);
          this.toastHandler.showErrorToastMessage('Server not available.');
        });
    });
  }

  setToken(token: SnapshotToken) {
    this.snapshotToken = token;
  }
}

// Don't remove this declaration: this is what enables TypeScript to resolve
// this service using `Owner.lookup('service:snapshot-token')`, as well
// as to check when you pass the service name as an argument to the decorator,
// like `@service('snapshot-token') declare altName: SnapshotTokenService;`.
declare module '@ember/service' {
  interface Registry {
    'snapshot-token': SnapshotTokenService;
  }
}
