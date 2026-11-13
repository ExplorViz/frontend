import { useAuthStore } from 'explorviz-frontend/src/stores/auth';
import { LandscapeToken } from 'explorviz-frontend/src/stores/landscape-token';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import { SerializedRoom } from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/types/serialized-room';
import { CommSummary } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/communication';
import { FlatLandscape } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { StructureLandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { DynamicLandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/telemetry/traces';
import { Timestamp } from 'explorviz-frontend/src/utils/landscape-schemes/timestamp';
import { parseSnapshotJson, stringifySnapshotJson } from 'explorviz-frontend/src/utils/snapshot/snapshot-json';
import { getResponseErrorMessage } from 'explorviz-frontend/src/utils/response-error';
import { create } from 'zustand';

export type SnapshotStructureData = {
  flatLandscapeData?: FlatLandscape;
  aggregatedFileCommunication?: CommSummary;
  structureLandscapeData?: StructureLandscapeData;
  dynamicLandscapeData?: DynamicLandscapeData;
};

/** Camera pose from the browser CameraControls (position + orbit target). */
export type SnapshotCamera = {
  x: number;
  y: number;
  z: number;
  targetX?: number;
  targetY?: number;
  targetZ?: number;
};

export type SnapshotToken = {
  owner: string;
  createdAt: number;
  name: string;
  landscapeToken: LandscapeToken;
  structureData: SnapshotStructureData;
  serializedRoom: SerializedRoom;
  timestamps: { timestamps: Timestamp[] };
  camera: SnapshotCamera;
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

const userService = import.meta.env.VITE_USER_SERV_URL;
const shareSnapshot = import.meta.env.VITE_SHARE_SNAPSHOT_URL || `${window.location.origin}/`;

function snapshotAuthHeaders(contentType = 'application/json; charset=UTF-8'): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': contentType };
  const accessToken = useAuthStore.getState().accessToken;
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return headers;
}

interface SnapshotTokenState {
  snapshotToken: SnapshotToken | null;
  snapshotSelected: boolean;
  latestSnapshotToken: SnapshotToken | null;
  retrieveTokens: () => Promise<SnapshotInfo>;
  retrieveToken: (owner: string, createdAt: number, isShared: boolean) => Promise<SnapshotToken | null>;
  /** Resolves to whether the Snapshot was saved; failures are shown as a toast. */
  saveSnapshot: (content: SnapshotToken, name?: string) => Promise<boolean>;
  subsribe: (owner: string, createdAt: number, subscriber: string) => Promise<void>;
  exportFile: (exportData: SnapshotToken) => Promise<void>;
  shareSnapshot: (snapshot: TinySnapshot, expDate: number) => Promise<void>;
  deleteSnapshot: (snapshot: TinySnapshot, isShared: boolean, subscribed: boolean) => Promise<void>;
  setToken: (token: SnapshotToken | null) => void;
  setSnapshotSelected: (value: boolean) => void;
}

export const useSnapshotTokenStore = create<SnapshotTokenState>((set, get) => ({
  snapshotToken: null, // tracked
  snapshotSelected: false, // tracked
  // Used in landscape selection to go back to last selected snapshot
  latestSnapshotToken: null,

  setSnapshotSelected: (value: boolean) => {
    set({ snapshotSelected: value });
  },

  retrieveTokens: () => {
    return new Promise<SnapshotInfo>((resolve) => {
      const userId = encodeURIComponent(useAuthStore.getState().user?.sub || '');
      if (!userId) {
        resolve({
          personalSnapshots: [],
          sharedSnapshots: [],
          subscribedSnapshots: [],
        });
        return;
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
              .showErrorToastMessage(await getResponseErrorMessage(response, 'Snapshots could not be loaded.'));
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
        `${userService}/snapshot/get?owner=${encodeURIComponent(owner)}&createdAt=${createdAt}&isShared=${isShared}&subscriber=${encodeURIComponent(useAuthStore.getState().user?.sub ?? '')}`,
        {
          headers: {
            Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
          },
        }
      )
        .then(async (response: Response) => {
          if (response.ok) {
            // The service answers with an empty body (204) if the snapshot does not exist.
            const text = await response.text();
            resolve(text ? parseSnapshotJson<SnapshotToken>(text) : null);
          } else {
            set({ snapshotSelected: false });
            set({ snapshotToken: null });
            resolve(null);
            useToastHandlerStore
              .getState()
              .showErrorToastMessage(await getResponseErrorMessage(response, 'Snapshot could not be loaded.'));
          }
        })
        .catch(async () => {
          set({ snapshotSelected: false });
          set({ snapshotToken: null });
          resolve(null);
          useToastHandlerStore.getState().showErrorToastMessage('Shared snapshot does not exist or is expired.');
        });
    });
  },

  saveSnapshot: async (content: SnapshotToken, name?: string) => {
    const snapshotToken: SnapshotToken = name !== undefined ? { ...content, name: name } : content;

    const url = `${userService}/snapshot/create`;
    let saved = false;
    await fetch(url, {
      method: 'POST',
      body: stringifySnapshotJson(snapshotToken),
      headers: snapshotAuthHeaders(),
    })
      .then(async (response: Response) => {
        if (response.ok) {
          saved = true;
          useToastHandlerStore.getState().showSuccessToastMessage('Successfully saved snapshot.');
        } else if (response.status === 422) {
          useToastHandlerStore
            .getState()
            .showErrorToastMessage(await getResponseErrorMessage(response, 'Snapshot already exists.'));
        } else {
          useToastHandlerStore
            .getState()
            .showErrorToastMessage(
              await getResponseErrorMessage(response, 'Something went wrong. Snapshot could not be saved.')
            );
        }
      })
      .catch(async () => {
        useToastHandlerStore.getState().showErrorToastMessage('Snapshot server could not be reached.');
      });
    return saved;
  },

  subsribe: async (owner: string, createdAt: number, subscriber: string) => {
    const url = `${userService}/snapshot/subscribe?owner=${encodeURIComponent(owner)}&createdAt=${createdAt}&subscriber=${encodeURIComponent(subscriber)}`;

    await fetch(url, {
      method: 'PUT',
      headers: snapshotAuthHeaders(),
    })
      .then(async (response: Response) => {
        if (!response.ok) {
          useToastHandlerStore
            .getState()
            .showErrorToastMessage(await getResponseErrorMessage(response, 'Something went wrong.'));
        }
      })
      .catch(async () => {
        useToastHandlerStore.getState().showErrorToastMessage('Snapshot server could not be reached.');
      });
  },

  exportFile: async (exportData: SnapshotToken) => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(stringifySnapshotJson(exportData))}`;
    const link = document.createElement('a');
    link.href = jsonString;
    link.download = `snapshot-${exportData.name}.explorviz`;

    link.click();
  },

  shareSnapshot: async (snapshot: TinySnapshot, expDate: number) => {
    const url = `${userService}/snapshot/share?owner=${encodeURIComponent(snapshot.owner)}&createdAt=${snapshot.createdAt}&deleteAt=${expDate}`;

    await fetch(url, {
      method: 'PUT',
      headers: snapshotAuthHeaders(),
    })
      .then(async (response: Response) => {
        if (response.status === 200) {
          useToastHandlerStore
            .getState()
            .showSuccessToastMessage(
              'Successfully shared snapshot. Use the share button of the shared snapshot to copy its URL.'
            );
        } else if (response.status === 222) {
          useToastHandlerStore.getState().showInfoToastMessage('A shared version already exists.');
        } else {
          useToastHandlerStore
            .getState()
            .showErrorToastMessage(
              await getResponseErrorMessage(response, 'Something went wrong. Snapshot could not be shared.')
            );
        }
      })
      .catch(async () => {
        useToastHandlerStore.getState().showErrorToastMessage('Snapshot server could not be reached.');
      });
  },

  deleteSnapshot: async (snapshot: TinySnapshot, isShared: boolean, subscribed: boolean) => {
    if (subscribed) {
      const url = `${userService}/snapshot/unsubscribe?owner=${encodeURIComponent(snapshot.owner)}&createdAt=${snapshot.createdAt}&subscriber=${encodeURIComponent(useAuthStore.getState().user?.sub ?? '')}`;

      await fetch(url, {
        method: 'PUT',
        headers: snapshotAuthHeaders(),
      })
        .then(async (response: Response) => {
          if (!response.ok) {
            useToastHandlerStore
              .getState()
              .showErrorToastMessage(
                await getResponseErrorMessage(response, 'Subscribed Snapshot could not be deleted.')
              );
          } else {
            useToastHandlerStore.getState().showSuccessToastMessage('Subscribed Snapshot successfully deleted.');
          }
        })
        .catch(async () => {
          useToastHandlerStore.getState().showErrorToastMessage('Snapshot server could not be reached.');
        });
    } else {
      const url = `${userService}/snapshot/delete?owner=${encodeURIComponent(snapshot.owner)}&createdAt=${snapshot.createdAt}&isShared=${isShared}`;

      await fetch(url, {
        method: 'DELETE',
        headers: snapshotAuthHeaders(),
      })
        .then(async (response: Response) => {
          if (response.ok) {
            useToastHandlerStore.getState().showSuccessToastMessage('Successfully deleted snapshot.');
          } else {
            useToastHandlerStore
              .getState()
              .showErrorToastMessage(
                await getResponseErrorMessage(response, 'Something went wrong. Snapshot could not be deleted.')
              );
          }
        })
        .catch(async () => {
          useToastHandlerStore.getState().showErrorToastMessage('Snapshot server could not be reached.');
        });
    }
  },

  setToken: (token: SnapshotToken | null) => {
    if (get().snapshotToken) {
      set({ latestSnapshotToken: get().snapshotToken });
    }

    set({ snapshotToken: token });

    if (token) {
      useToastHandlerStore.getState().showInfoToastMessage(`Set snapshot token to " ${token.name}"`);
    }
  },
}));
