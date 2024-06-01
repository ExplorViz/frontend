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
  configuration: any;
  camera: any;
  annotations: any;
  isShared: boolean;
  deleteAt: number;
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

  async exportFile(exportData: SnapshotToken) {
    const jsonString = `data:text/json;chatset=utf-8,${encodeURIComponent(
      JSON.stringify(exportData, getCircularReplacer())
    )}`;
    const link = document.createElement('a');
    link.href = jsonString;
    link.download = 'data.viz';

    link.click();
  }

  async shareSnapshot(snapshot: SnapshotToken) {
    const snapshotToken = {
      ...snapshot,
      name: snapshot.name + ' (shared)',
      isShared: true,
    };

    const url = `${userServiceApi}/snapshot/create`;
    await fetch(url, {
      method: 'POST',
      body: JSON.stringify(snapshotToken, getCircularReplacer()),
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
        } else if (response.status === 422) {
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

  async deleteSnapshot(snapshot: SnapshotToken) {
    const url = `${userServiceApi}/snapshot/delete?owner=${snapshot.owner}&createdAt=${snapshot.createdAt}&isShared=${snapshot.isShared}`;

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
        this.toastHandler.showErrorToastMessage('Server could not be reached.');
      });

    this.router.refresh('landscapes');
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
