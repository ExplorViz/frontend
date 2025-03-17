import { create } from 'zustand';
import { useAuthStore } from './auth';
import { LandscapeToken } from 'react-lib/src/stores/landscape-token';
import { getCircularReplacer } from 'react-lib/src/utils/circularReplacer';
import { StructureLandscapeData } from 'react-lib/src/utils/landscape-schemes/structure-data';
import { DynamicLandscapeData } from 'react-lib/src/utils/landscape-schemes/dynamic/dynamic-data';
import { SerializedRoom } from 'react-lib/src/utils/collaboration/web-socket-messages/types/serialized-room';
import { Timestamp } from 'react-lib/src/utils/landscape-schemes/timestamp';
import { reject } from 'rsvp';
import { useToastHandlerStore } from 'react-lib/src/stores/toast-handler';
import { useRouterStore } from 'react-lib/src/stores/store-router';
import { createSearchParams } from 'react-router-dom';

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

const userService = 'http://localhost:8084'; //import.meta.env.VITE_USER_SERV_URL;
const shareSnapshot = 'http://localhost:4200/'; //import.meta.env.VITE_SHARE_SNAPSHOT_URL;

interface SnapshotTokenState {
  snapshotToken: SnapshotToken | null;
  snapshotSelected: boolean;
  latestSnapshotToken: SnapshotToken | null;
  retrieveTokens: () => Promise<SnapshotInfo>;
  retrieveToken: (
    owner: string,
    createdAt: number,
    isShared: boolean
  ) => Promise<SnapshotToken | null>;
  saveSnapshot: (content: SnapshotToken, name?: string) => Promise<void>;
  subsribe: (
    owner: string,
    createdAt: number,
    subscriber: string
  ) => Promise<void>;
  exportFile: (exportData: SnapshotToken) => Promise<void>;
  shareSnapshot: (snapshot: TinySnapshot, expDate: number) => Promise<void>;
  deleteSnapshot: (
    snapshot: TinySnapshot,
    isShared: boolean,
    subscribed: boolean
  ) => Promise<void>;
  setToken: (token: SnapshotToken | null) => void;
}

export const useSnapshotTokenStore = create<SnapshotTokenState>((set, get) => ({
  snapshotToken: null, // tracked
  snapshotSelected: false, // tracked
  // Used in landscape selection to go back to last selected snapshot
  latestSnapshotToken: null,

  retrieveTokens: () => {
    return new Promise<SnapshotInfo>((resolve) => {
      const userId = encodeURI(
        useAuthStore.getState().user?.sub.toString() || ''
      ); // TODO: Does this work?
      if (!userId) {
        resolve({
          personalSnapshots: [],
          sharedSnapshots: [],
          subscribedSnapshots: [],
        });
      }

      fetch(`${userService}/snapshot?owner=${userId}`, {
        headers: {
          Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
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
  },

  /**
   * Used to load shared snapshots. Will be used to load personal snapshots too . Update Toasthandler later
   * @param owner
   * @param createdAt
   * @returns
   */
  retrieveToken: (owner: string, createdAt: number, isShared: boolean) => {
    return new Promise<SnapshotToken | null>((resolve) => {
      fetch(
        `${userService}/snapshot/get?owner=${owner}&createdAt=${createdAt}&isShared=${isShared}&subscriber=${useAuthStore.getState().user!.sub}`,
        {
          headers: {
            Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
          },
        }
      )
        .then(async (response: Response) => {
          if (response.ok) {
            const tokens = (await response.json()) as SnapshotToken | null;
            resolve(tokens);
          } else {
            set({ snapshotSelected: false });
            set({ snapshotToken: null });
            useRouterStore.getState().navigateTo!('/landscapes');
            // TODO: In case of problem: In old implementation, landscapeToken was set to undefined
            // useRouterStore.getState().navigateTo({
            //   pathname: '/landscapes',
            //   search: `?${createSearchParams({ landscapeToken: undefined })}`,
            // });
            reject();
            useToastHandlerStore
              .getState()
              .showErrorToastMessage('Snapshot could not be loaded.');
          }
        })
        .catch(async () => {
          set({ snapshotSelected: false });
          set({ snapshotToken: null });
          useRouterStore.getState().navigateTo!('/landscapes');
          // TODO: In case of problem: In old implementation, landscapeToken was set to undefined
          // useRouterStore.getState().navigateTo({
          //   pathname: '/landscapes',
          //   search: `?${createSearchParams({ landscapeToken: undefined })}`,
          // });
          reject();
          useToastHandlerStore
            .getState()
            .showErrorToastMessage(
              'Shared snapshot does not exist or is expired.'
            );
        });
    });
  },

  saveSnapshot: async (content: SnapshotToken, name?: string) => {
    const snapshotToken: SnapshotToken =
      name !== undefined ? { ...content, name: name } : content;

    const url = `${userService}/snapshot/create`;
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
      useRouterStore.getState().navigateTo!('/landscapes');
    }
  },

  subsribe: async (owner: string, createdAt: number, subscriber: string) => {
    const url = `${userService}/snapshot/subscribe?owner=${owner}&createdAt=${createdAt}&subscriber=${subscriber}`;

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
  },

  exportFile: async (exportData: SnapshotToken) => {
    const jsonString = `data:text/json;chatset=utf-8,${encodeURIComponent(
      JSON.stringify(exportData, getCircularReplacer())
    )}`;
    const link = document.createElement('a');
    link.href = jsonString;
    link.download = `snapshot-${exportData.name}.explorviz`;

    link.click();
  },

  shareSnapshot: async (snapshot: TinySnapshot, expDate: number) => {
    const url = `${userService}/snapshot/share?owner=${snapshot.owner}&createdAt=${snapshot.createdAt}&deleteAt=${expDate}`;

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

    useRouterStore.getState().navigateTo!('/landscapes');
  },

  deleteSnapshot: async (
    snapshot: TinySnapshot,
    isShared: boolean,
    subscribed: boolean
  ) => {
    if (subscribed) {
      const url = `${userService}/snapshot/unsubscribe?owner=${snapshot.owner}&createdAt=${snapshot.createdAt}&subscriber=${useAuthStore.getState().user!.sub}`;

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
      const url = `${userService}/snapshot/delete?owner=${snapshot.owner}&createdAt=${snapshot.createdAt}&isShared=${isShared}`;

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

    useRouterStore.getState().navigateTo!('/landscapes');
  },

  setToken: (token: SnapshotToken | null) => {
    if (get().snapshotToken) {
      set({ latestSnapshotToken: get().snapshotToken });
    }

    set({ snapshotToken: token });

    if (token) {
      useToastHandlerStore
        .getState()
        .showInfoToastMessage(`Set snapshot token to " ${token.name}"`);
    }
  },
}));
