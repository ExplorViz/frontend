import Service from '@ember/service';
import { service } from '@ember/service';
import Auth from './auth';
import ENV from 'explorviz-frontend/config/environment';
import { useSpectateConfigurationStore } from 'react-lib/src/stores/spectate-configuration';
import { useToastHandlerStore } from 'react-lib/src/stores/toast-handler';

// INFO:
// Completely migrated to react-lib. In react-lib toast-service and ENV
// just have to be included.

export type SpectateConfig = {
  id: string;
  user: string;
  devices: { deviceId: string; projectionMatrix: number[] }[];
};

const collaborationServiceApi = ENV.backendAddresses.collaborationService;

export default class SpectateConfigurationService extends Service {
  @service('auth')
  private auth!: Auth;

  // // @tracked
  // // spectateConfig: SpectateConfig | null = null;
  // get specateConfig(): SpectateConfig | null {
  //   return useSpectateConfigurationStore.getState().spectateConfig;
  // }

  // set spectateConfig(value: SpectateConfig | null) {
  //   useSpectateConfigurationStore.setState({ spectateConfig: value });
  // }

  // retrieveConfigs() {
  //   return new Promise<SpectateConfig[]>((resolve) => {
  //     const userId = encodeURI(this.auth.user?.sub || '');
  //     if (!userId) {
  //       resolve([]);
  //     }

  //     fetch(`${collaborationServiceApi}/spectateConfig/all`, {
  //       headers: {
  //         Authorization: `Bearer ${this.auth.accessToken}`,
  //       },
  //     })
  //       .then(async (response: Response) => {
  //         if (response.ok) {
  //           const spectateConfiguration =
  //             (await response.json()) as SpectateConfig[];
  //           resolve(spectateConfiguration);
  //         } else {
  //           resolve([]);
  //           console.error('Spectate Configurations could not be loaded.');
  //         }
  //       })
  //       .catch(async () => {
  //         resolve([]);
  //         useToastHandlerStore.getState().showErrorToastMessage(
  //           'Server for spectate configuration not available.'
  //         );
  //       });
  //   });
  // }

  // async saveSpectateConfig(content: SpectateConfig) {
  //   const url = `${collaborationServiceApi}/spectateConfig/add`;

  //   await fetch(url, {
  //     method: 'POST',
  //     body: JSON.stringify(content),
  //     headers: { 'Content-Type': 'application/json; charset=UTF-8' },
  //   })
  //     .then(async (response: Response) => {
  //       if (response.ok) {
  //         useToastHandlerStore.getState().showSuccessToastMessage(
  //           'Successfully created spectate configuration.'
  //         );
  //       } else {
  //         useToastHandlerStore.getState().showErrorToastMessage(
  //           'Something went wrong. Spectate configuration could not be saved.'
  //         );
  //       }
  //     })
  //     .catch(async () => {
  //       useToastHandlerStore.getState().showErrorToastMessage(
  //         'Spectate config server not reachable..'
  //       );
  //     });
  // }

  // async updateSpectateConfig(content: SpectateConfig) {
  //   const url = `${collaborationServiceApi}/spectateConfig/update`;

  //   await fetch(url, {
  //     method: 'PUT',
  //     body: JSON.stringify(content),
  //     headers: { 'Content-Type': 'application/json; charset=UTF-8' },
  //   })
  //     .then(async (response: Response) => {
  //       if (response.ok) {
  //         const res = await response.text();

  //         if (Number(res) === -1) {
  //           useToastHandlerStore.getState().showErrorToastMessage(
  //             'The configuration to be updated does not exist.'
  //           );
  //         } else if (Number(res) === -2) {
  //           useToastHandlerStore.getState().showErrorToastMessage(
  //             'You are not allowed to update this configuration.'
  //           );
  //         } else {
  //           useToastHandlerStore.getState().showSuccessToastMessage(
  //             'Successfully updated spectate configuration.'
  //           );
  //         }
  //       } else {
  //         useToastHandlerStore.getState().showErrorToastMessage(
  //           'Something went wrong. Spectate configuration could not be updated.'
  //         );
  //       }
  //     })
  //     .catch(async () => {
  //       useToastHandlerStore.getState().showErrorToastMessage(
  //         'Spectate config server not reachable..'
  //       );
  //     });
  // }

  // async deleteSpectateConfig(content: SpectateConfig) {
  //   const url = `${collaborationServiceApi}/spectateConfig/delete`;

  //   await fetch(url, {
  //     method: 'DELETE',
  //     body: JSON.stringify(content),
  //     headers: { 'Content-Type': 'application/json; charset=UTF-8' },
  //   })
  //     .then(async (response: Response) => {
  //       if (response.ok) {
  //         const res = await response.text();

  //         if (Number(res) === -1) {
  //           useToastHandlerStore.getState().showErrorToastMessage(
  //             'The configuration to be deleted doesn`t exist.'
  //           );
  //         } else if (Number(res) === -2) {
  //           useToastHandlerStore.getState().showErrorToastMessage(
  //             'You are not allowed to delete this configuration.'
  //           );
  //         } else {
  //           useToastHandlerStore.getState().showSuccessToastMessage(
  //             'Successfully deleted spectate configuration.'
  //           );
  //         }
  //       } else {
  //         useToastHandlerStore.getState().showErrorToastMessage(
  //           'Something went wrong. Spectate configuration could not be deleted.'
  //         );
  //       }
  //     })
  //     .catch(async () => {
  //       useToastHandlerStore.getState().showErrorToastMessage(
  //         'Spectate config server not reachable..'
  //       );
  //     });
  // }
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
