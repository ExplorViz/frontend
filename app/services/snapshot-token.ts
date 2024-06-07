import Service, { inject as service } from '@ember/service';
import ENV from 'explorviz-frontend/config/environment';
import Auth from './auth';
import ToastHandlerService from './toast-handler';
import { LandscapeToken } from './landscape-token';
import { tracked } from '@glimmer/tracking';
import { getCircularReplacer } from 'explorviz-frontend/utils/circularReplacer';
import { StructureLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import { DynamicLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/dynamic/dynamic-data';
import { SerializedRoom } from 'collaboration/utils/web-socket-messages/types/serialized-room';
import { Timestamp } from 'explorviz-frontend/utils/landscape-schemes/timestamp';

export type SnapshotToken = {
  owner: string;
  createdAt: number;
  name: string;
  landscapeToken: LandscapeToken;
  structureData: {
    structureLandscapeData: StructureLandscapeData;
    dynamicLandscapeData: DynamicLandscapeData;
  };
  serializedRoom: SerializedRoom;
  timestamps: { timestamps: Timestamp[] };
  camera: any;
  annotations: any;
  isShared: boolean;
  subscribedUsers: { subscriberList: string[] };
  deleteAt: number;
};

export type TinySnapshot = {
  owner: string;
  createdAt: number;
  name: string;
  landscapeToken: LandscapeToken;
};

export type SnapshotInfo = {
  personalSnapshots: TinySnapshot[];
  sharedSnapshots: TinySnapshot[];
  subsricedSnapshots: TinySnapshot[];
};

const { userServiceApi } = ENV.backendAddresses;
const shareSnapshotURL = ENV.shareSnapshotURL;

export default class SnapshotTokenService extends Service {
  @service('auth')
  private auth!: Auth;

  @service('router')
  router!: any;

  @service('toast-handler')
  toastHandler!: ToastHandlerService;

  @tracked
  snapshotToken: SnapshotToken | null = null;

  @tracked
  snapshotSelected: boolean = false;

  // Used in landscape selection to go back to last selected snapshot
  @tracked
  latestSnapshotToken: SnapshotToken | null = null;

  retrieveTokens() {
    return new Promise<SnapshotInfo>((resolve) => {
      const userId = encodeURI(this.auth.user?.sub || '');
      if (!userId) {
        resolve({
          personalSnapshots: [],
          sharedSnapshots: [],
          subsricedSnapshots: [],
        });
      }

      fetch(`${userServiceApi}/snapshot?owner=${userId}`, {
        headers: {
          Authorization: `Bearer ${this.auth.accessToken}`,
        },
      })
        .then(async (response: Response) => {
          if (response.ok) {
            const snapshotInfo = (await response.json()) as SnapshotInfo;
            resolve(snapshotInfo);
          } else {
            resolve({
              personalSnapshots: [],
              sharedSnapshots: [],
              subsricedSnapshots: [],
            });
            this.toastHandler.showErrorToastMessage(
              'Snapshots could not be loaded.'
            );
          }
        })
        .catch(async () => {
          resolve({
            personalSnapshots: [],
            sharedSnapshots: [],
            subsricedSnapshots: [],
          });
          this.toastHandler.showErrorToastMessage('Server not available.');
        });
    });
  }

  /**
   * Used to load shared snapshots. Will be used to load personal snapshots too . Update Toasthandler later
   * @param owner
   * @param createdAt
   * @returns
   */
  retrieveToken(owner: string, createdAt: number, isShared: boolean) {
    return new Promise<SnapshotToken | null>((resolve) => {
      fetch(`${userServiceApi}/snapshot/${owner}/${createdAt}/${isShared}`, {
        headers: {
          Authorization: `Bearer ${this.auth.accessToken}`,
        },
      })
        .then(async (response: Response) => {
          if (response.ok) {
            const tokens = (await response.json()) as SnapshotToken | null;
            resolve(tokens);
          } else {
            resolve(null);
            this.toastHandler.showErrorToastMessage(
              'Snapshot could not be loaded.'
            );
          }
        })
        .catch(async () => {
          resolve(null);
          this.toastHandler.showErrorToastMessage(
            'Shared snapshot does not exist or is expired.'
          );
        });
    });
  }

  async saveSnapshot(content: SnapshotToken, name?: string) {
    const snapshotToken: SnapshotToken =
      name !== undefined ? { ...content, name: name } : content;

    const url = `${userServiceApi}/snapshot/create`;
    await fetch(url, {
      method: 'POST',
      body: JSON.stringify(snapshotToken, getCircularReplacer()),
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    })
      .then(async (response: Response) => {
        if (response.ok) {
          this.toastHandler.showSuccessToastMessage(
            'Successfully saved snapshot.'
          );
        } else if (response.status === 422) {
          this.toastHandler.showErrorToastMessage('Snapshot already exists.');
        } else {
          this.toastHandler.showErrorToastMessage(
            'Something went wrong. Snapshot could not be saved.'
          );
        }
      })
      .catch(async () => {
        this.toastHandler.showErrorToastMessage('Server could not be reached.');
      });

    if (name !== undefined) {
      this.router.refresh('landscapes');
    }
  }

  async subsribe(owner: string, createdAt: number, subscriber: string) {
    const url = `${userServiceApi}/snapshot/subscribe?owner=${owner}&createdAt=${createdAt}&subscriber=${subscriber}`;

    await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    })
      .then(async (response: Response) => {
        if (!response.ok) {
          this.toastHandler.showErrorToastMessage('Something went wrong.');
        }
      })
      .catch(async () => {
        this.toastHandler.showErrorToastMessage('Server could not be reached.');
      });
  }

  async exportFile(exportData: SnapshotToken) {
    const jsonString = `data:text/json;chatset=utf-8,${encodeURIComponent(
      JSON.stringify(exportData, getCircularReplacer())
    )}`;
    const link = document.createElement('a');
    link.href = jsonString;
    link.download = 'data.explorviz';

    link.click();
  }

  async shareSnapshot(snapshot: TinySnapshot, expDate: number) {
    const url = `${userServiceApi}/snapshot/share?owner=${snapshot.owner}&createdAt=${snapshot.createdAt}&deleteAt=${expDate}`;

    await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    })
      .then(async (response: Response) => {
        if (response.ok) {
          await navigator.clipboard.writeText(
            `${shareSnapshotURL}visualization?landscapeToken=${snapshot.landscapeToken.value}&owner=${snapshot.owner}&createdAt=${snapshot.createdAt}&sharedSnapshot=${true}`
          );
          this.toastHandler.showSuccessToastMessage(
            'Successfully shared snapshot. Snaphsot URL copied to clipboard'
          );
        } else if (response.status === 222) {
          this.toastHandler.showErrorToastMessage(
            'Snapshot could not be shared. A shared version already exists.'
          );
        } else {
          this.toastHandler.showErrorToastMessage(
            'Something went wrong. Snapshot could not be shared.'
          );
        }
      })
      .catch(async () => {
        this.toastHandler.showErrorToastMessage('Server could not be reached.');
      });

    this.router.refresh('landscapes');
  }

  async deleteSnapshot(
    snapshot: TinySnapshot,
    isShared: boolean,
    subscribed: boolean
  ) {
    if (subscribed) {
      const url = `${userServiceApi}/snapshot/unsubscribe?owner=${snapshot.owner}&createdAt=${snapshot.createdAt}&subscriber=${this.auth.user!.sub}`;

      await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      }).then(async (response: Response) => {
        if (!response.ok) {
          this.toastHandler.showErrorToastMessage(
            'Subscribed Snapshot could not be deleted.'
          );
        } else {
          this.toastHandler.showSuccessToastMessage(
            'Subscribed Snapshot successfully deleted.'
          );
        }
      });
    } else {
      const url = `${userServiceApi}/snapshot/delete?owner=${snapshot.owner}&createdAt=${snapshot.createdAt}&isShared=${isShared}`;

      await fetch(url, {
        method: 'DELETE',
      })
        .then(async (response: Response) => {
          if (response.ok) {
            this.toastHandler.showSuccessToastMessage(
              'Successfully deleted snapshot.'
            );
          } else {
            this.toastHandler.showErrorToastMessage(
              'Something went wrong. Snapshot could not be deleted.'
            );
          }
        })
        .catch(async () => {
          this.toastHandler.showErrorToastMessage(
            'Server could not be reached.'
          );
        });
    }

    this.router.refresh('landscapes');
  }

  setToken(token: SnapshotToken | null) {
    if (this.snapshotToken) {
      this.latestSnapshotToken = this.snapshotToken;
    }

    this.snapshotToken = token;

    if (token) {
      this.toastHandler.showInfoToastMessage(
        `Set snapshot token to " ${token.name}"`
      );
    }
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
