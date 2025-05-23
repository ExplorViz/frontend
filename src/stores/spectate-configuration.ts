import { create } from 'zustand';
import { useAuthStore } from 'explorviz-frontend/src/stores/auth';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';

const collaborationServiceApi = import.meta.env.VITE_COLLAB_SERV_URL;

interface SpectateConfigurationState {
  spectateConfig: SpectateConfig | null; // tracked
  retrieveConfigs: () => Promise<SpectateConfig[]>;
  saveSpectateConfig: (content: SpectateConfig) => Promise<void>;
  updateSpectateConfig: (content: SpectateConfig) => Promise<void>;
  deleteSpectateConfig: (content: SpectateConfig) => Promise<void>;
}

export type SpectateConfig = {
  id: string;
  user: string;
  devices: { deviceId: string; projectionMatrix: number[] }[];
};

export const useSpectateConfigurationStore = create<SpectateConfigurationState>(
  (set, get) => ({
    spectateConfig: null,

    retrieveConfigs: () => {
      return new Promise<SpectateConfig[]>((resolve) => {
        const userId = encodeURI(useAuthStore.getState().user?.sub || '');
        if (!userId) {
          resolve([]);
        }

        fetch(`${collaborationServiceApi}/spectateConfig/all`, {
          headers: {
            Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
          },
        })
          .then(async (response: Response) => {
            if (response.ok) {
              const spectateConfiguration =
                (await response.json()) as SpectateConfig[];
              resolve(spectateConfiguration);
            } else {
              resolve([]);
              console.error('Spectate Configurations could not be loaded.');
            }
          })
          .catch(async () => {
            resolve([]);
            useToastHandlerStore
              .getState()
              .showErrorToastMessage(
                'Server for spectate configuration not available.'
              );
          });
      });
    },

    saveSpectateConfig: async (content: SpectateConfig) => {
      const url = `${collaborationServiceApi}/spectateConfig/add`;

      await fetch(url, {
        method: 'POST',
        body: JSON.stringify(content),
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      })
        .then(async (response: Response) => {
          if (response.ok) {
            useToastHandlerStore
              .getState()
              .showSuccessToastMessage(
                'Successfully created spectate configuration.'
              );
          } else {
            useToastHandlerStore
              .getState()
              .showErrorToastMessage(
                'Something went wrong. Spectate configuration could not be saved.'
              );
          }
        })
        .catch(async () => {
          useToastHandlerStore
            .getState()
            .showErrorToastMessage('Spectate config server not reachable..');
        });
    },

    updateSpectateConfig: async (content: SpectateConfig) => {
      const url = `${collaborationServiceApi}/spectateConfig/update`;

      await fetch(url, {
        method: 'PUT',
        body: JSON.stringify(content),
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      })
        .then(async (response: Response) => {
          if (response.ok) {
            const res = await response.text();

            if (Number(res) === -1) {
              useToastHandlerStore
                .getState()
                .showErrorToastMessage(
                  'The configuration to be updated does not exist.'
                );
            } else if (Number(res) === -2) {
              useToastHandlerStore
                .getState()
                .showErrorToastMessage(
                  'You are not allowed to update this configuration.'
                );
            } else {
              useToastHandlerStore
                .getState()
                .showSuccessToastMessage(
                  'Successfully updated spectate configuration.'
                );
            }
          } else {
            useToastHandlerStore
              .getState()
              .showErrorToastMessage(
                'Something went wrong. Spectate configuration could not be updated.'
              );
          }
        })
        .catch(async () => {
          useToastHandlerStore
            .getState()
            .showErrorToastMessage('Spectate config server not reachable..');
        });
    },

    deleteSpectateConfig: async (content: SpectateConfig) => {
      const url = `${collaborationServiceApi}/spectateConfig/delete`;

      await fetch(url, {
        method: 'DELETE',
        body: JSON.stringify(content),
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      })
        .then(async (response: Response) => {
          if (response.ok) {
            const res = await response.text();

            if (Number(res) === -1) {
              useToastHandlerStore
                .getState()
                .showErrorToastMessage(
                  'The configuration to be deleted doesn`t exist.'
                );
            } else if (Number(res) === -2) {
              useToastHandlerStore
                .getState()
                .showErrorToastMessage(
                  'You are not allowed to delete this configuration.'
                );
            } else {
              useToastHandlerStore
                .getState()
                .showSuccessToastMessage(
                  'Successfully deleted spectate configuration.'
                );
            }
          } else {
            useToastHandlerStore
              .getState()
              .showErrorToastMessage(
                'Something went wrong. Spectate configuration could not be deleted.'
              );
          }
        })
        .catch(async () => {
          useToastHandlerStore
            .getState()
            .showErrorToastMessage('Spectate config server not reachable..');
        });
    },
  })
);
