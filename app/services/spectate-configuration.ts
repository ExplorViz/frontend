import Service from '@ember/service';
import { service } from '@ember/service';
import Auth from './auth';
import { tracked } from '@glimmer/tracking';
import ENV from 'explorviz-frontend/config/environment';
import ToastHandlerService from './toast-handler';

export type SpectateConfig = {
  id: string;
  user: string;
  devices: { deviceId: string; projectionMatrix: number[] }[];
};

const collaborationServiceApi = ENV.backendAddresses.collaborationService;

export default class SpectateConfigurationService extends Service {
  @service('auth')
  private auth!: Auth;

  @service('toast-handler')
  toastHandler!: ToastHandlerService;

  @tracked
  spectateConfig: SpectateConfig | null = null;

  retrieveConfigs() {
    return new Promise<SpectateConfig[]>((resolve) => {
      const userId = encodeURI(this.auth.user?.sub || '');
      if (!userId) {
        resolve([]);
      }

      fetch(`${collaborationServiceApi}/spectateConfig/all`, {
        headers: {
          Authorization: `Bearer ${this.auth.accessToken}`,
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
          this.toastHandler.showErrorToastMessage('Server not available.');
        });
    });
  }

  async saveSpectateConfig(content: SpectateConfig) {
    const url = `${collaborationServiceApi}/spectateConfig/add`;

    await fetch(url, {
      method: 'POST',
      body: JSON.stringify(content),
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    })
      .then(async (response: Response) => {
        if (response.ok) {
          this.toastHandler.showSuccessToastMessage(
            'Successfully created spectate configuration.'
          );
        } else {
          this.toastHandler.showErrorToastMessage(
            'Something went wrong. Spectate configuration could not be saved.'
          );
        }
      })
      .catch(async () => {
        this.toastHandler.showErrorToastMessage('Server could not be reached.');
      });
  }

  async updateSpectateConfig(content: SpectateConfig) {
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
            this.toastHandler.showErrorToastMessage(
              'The configuration to be updated does not exist.'
            );
          } else if (Number(res) === -2) {
            this.toastHandler.showErrorToastMessage(
              'You are not allowed to update this configuration.'
            );
          } else {
            this.toastHandler.showSuccessToastMessage(
              'Successfully updated spectate configuration.'
            );
          }
        } else {
          this.toastHandler.showErrorToastMessage(
            'Something went wrong. Spectate configuration could not be updated.'
          );
        }
      })
      .catch(async () => {
        this.toastHandler.showErrorToastMessage('Server could not be reached.');
      });
  }

  async deleteSpectateConfig(content: SpectateConfig) {
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
            this.toastHandler.showErrorToastMessage(
              'The configuration to be deleted doesn`t exist.'
            );
          } else if (Number(res) === -2) {
            this.toastHandler.showErrorToastMessage(
              'You are not allowed to delete this configuration.'
            );
          } else {
            this.toastHandler.showSuccessToastMessage(
              'Successfully deleted spectate configuration.'
            );
          }
        } else {
          this.toastHandler.showErrorToastMessage(
            'Something went wrong. Spectate configuration could not be deleted.'
          );
        }
      })
      .catch(async () => {
        this.toastHandler.showErrorToastMessage('Server could not be reached.');
      });
  }
}

// Don't remove this declaration: this is what enables TypeScript to resolve
// this service using `Owner.lookup('service:spectate-configuration')`, as well
// as to check when you pass the service name as an argument to the decorator,
// like `@service('spectate-configuration') declare altName: SpectateConfigurationService;`.
declare module '@ember/service' {
  interface Registry {
    'spectate-configuration': SpectateConfigurationService;
  }
}
