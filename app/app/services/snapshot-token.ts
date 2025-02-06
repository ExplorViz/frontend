import Service, { inject as service } from '@ember/service';
import ENV from 'explorviz-frontend/config/environment';
import Auth from './auth';
import { LandscapeToken } from './landscape-token';
import { getCircularReplacer } from 'react-lib/src/utils/circularReplacer';
import { StructureLandscapeData } from 'react-lib/src/utils/landscape-schemes/structure-data';
import { DynamicLandscapeData } from 'react-lib/src/utils/landscape-schemes/dynamic/dynamic-data';
import { SerializedRoom } from 'react-lib/src/utils/collaboration/web-socket-messages/types/serialized-room';
import { Timestamp } from 'react-lib/src/utils/landscape-schemes/timestamp';
import { reject } from 'rsvp';
import { useSnapshotTokenStore } from 'react-lib/src/stores/snapshot-token';
import { useToastHandlerStore } from 'react-lib/src/stores/toast-handler';

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
  camera: { x: number; y: number; z: number };
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
  subscribedSnapshots: TinySnapshot[];
};

const { userServiceApi, shareSnapshot } = ENV.backendAddresses;

export default class SnapshotTokenService extends Service {
  @service('auth')
  private auth!: Auth;

  @service('router')
  router!: any;

  // @tracked
  // snapshotToken: SnapshotToken | null = null;
  get snapshotToken(): SnapshotToken | null {
    return useSnapshotTokenStore.getState().snapshotToken;
  }

  set snapshotToken(value: SnapshotToken | null) {
    useSnapshotTokenStore.setState({ snapshotToken: value });
  }

  // @tracked
  // snapshotSelected: boolean = false;
  get snapshotSelected(): boolean {
    return useSnapshotTokenStore.getState().snapshotSelected;
  }

  set snapshotSelected(value: boolean) {
    useSnapshotTokenStore.setState({ snapshotSelected: value });
  }

  // // Used in landscape selection to go back to last selected snapshot
  // @tracked
  // latestSnapshotToken: SnapshotToken | null = null;
  get latestSnapshotToken(): SnapshotToken | null {
    return useSnapshotTokenStore.getState().latestSnapshotToken;
  }

  set latestSnapshotToken(value: SnapshotToken | null) {
    useSnapshotTokenStore.setState({ latestSnapshotToken: value });
  }

  retrieveTokens() {
    return new Promise<SnapshotInfo>((resolve) => {
      const userId = encodeURI(this.auth.user?.sub || '');
      if (!userId) {
        resolve({
          personalSnapshots: [],
          sharedSnapshots: [],
          subscribedSnapshots: [],
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
              subscribedSnapshots: [],
            });
            useToastHandlerStore
              .getState()
              .showErrorToastMessage('Snapshots could not be loaded.');
          }
        })
        .catch(async () => {
          resolve({
            personalSnapshots: [],
            sharedSnapshots: [],
            subscribedSnapshots: [],
          });
          console.error('Server for snapshots not available.');
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
      fetch(
        `${userServiceApi}/snapshot/get?owner=${owner}&createdAt=${createdAt}&isShared=${isShared}&subscriber=${this.auth.user!.sub}`,
        {
          headers: {
            Authorization: `Bearer ${this.auth.accessToken}`,
          },
        }
      )
        .then(async (response: Response) => {
          if (response.ok) {
            const tokens = (await response.json()) as SnapshotToken | null;
            resolve(tokens);
          } else {
            this.snapshotSelected = false;
            this.snapshotToken = null;
            this.router.transitionTo('landscapes', {
              queryParams: { landscapeToken: undefined },
            });
            reject();
            useToastHandlerStore
              .getState()
              .showErrorToastMessage('Snapshot could not be loaded.');
          }
        })
        .catch(async () => {
          this.snapshotSelected = false;
          this.snapshotToken = null;
          this.router.transitionTo('landscapes', {
            queryParams: { landscapeToken: undefined },
          });
          reject();
          useToastHandlerStore
            .getState()
            .showErrorToastMessage(
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
          useToastHandlerStore
            .getState()
            .showSuccessToastMessage('Successfully saved snapshot.');
        } else if (response.status === 422) {
          useToastHandlerStore
            .getState()
            .showErrorToastMessage('Snapshot already exists.');
        } else {
          useToastHandlerStore
            .getState()
            .showErrorToastMessage(
              'Something went wrong. Snapshot could not be saved.'
            );
        }
      })
      .catch(async () => {
        useToastHandlerStore
          .getState()
          .showErrorToastMessage('Snapshot server could not be reached.');
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
          useToastHandlerStore
            .getState()
            .showErrorToastMessage('Something went wrong.');
        }
      })
      .catch(async () => {
        useToastHandlerStore
          .getState()
          .showErrorToastMessage('Snapshot server could not be reached.');
      });
  }

  async exportFile(exportData: SnapshotToken) {
    const jsonString = `data:text/json;chatset=utf-8,${encodeURIComponent(
      JSON.stringify(exportData, getCircularReplacer())
    )}`;
    const link = document.createElement('a');
    link.href = jsonString;
    link.download = `snapshot-${exportData.name}.explorviz`;

    link.click();
  }

  async shareSnapshot(snapshot: TinySnapshot, expDate: number) {
    const url = `${userServiceApi}/snapshot/share?owner=${snapshot.owner}&createdAt=${snapshot.createdAt}&deleteAt=${expDate}`;

    await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    })
      .then(async (response: Response) => {
        console.log(response.status);
        if (response.status === 200) {
          await navigator.clipboard.writeText(
            `${shareSnapshot}visualization?landscapeToken=${snapshot.landscapeToken.value}&owner=${snapshot.owner}&createdAt=${snapshot.createdAt}&sharedSnapshot=${true}`
          );
          useToastHandlerStore
            .getState()
            .showSuccessToastMessage(
              'Successfully shared snapshot. Snaphsot URL copied to clipboard'
            );
        } else if (response.status === 222) {
          useToastHandlerStore
            .getState()
            .showInfoToastMessage('A shared version already exists.');
        } else {
          useToastHandlerStore
            .getState()
            .showErrorToastMessage(
              'Something went wrong. Snapshot could not be shared.'
            );
        }
      })
      .catch(async () => {
        useToastHandlerStore
          .getState()
          .showErrorToastMessage('Snapshot server could not be reached.');
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
          useToastHandlerStore
            .getState()
            .showErrorToastMessage('Subscribed Snapshot could not be deleted.');
        } else {
          useToastHandlerStore
            .getState()
            .showSuccessToastMessage(
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
            useToastHandlerStore
              .getState()
              .showSuccessToastMessage('Successfully deleted snapshot.');
          } else {
            useToastHandlerStore
              .getState()
              .showErrorToastMessage(
                'Something went wrong. Snapshot could not be deleted.'
              );
          }
        })
        .catch(async () => {
          useToastHandlerStore
            .getState()
            .showErrorToastMessage('Snapshot server could not be reached.');
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
      useToastHandlerStore
        .getState()
        .showInfoToastMessage(`Set snapshot token to " ${token.name}"`);
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
