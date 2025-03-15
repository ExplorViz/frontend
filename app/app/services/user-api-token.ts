import Service, { inject as service } from '@ember/service';
import { useAuthStore } from 'react-lib/src/stores/auth';
import ENV from 'explorviz-frontend/config/environment';
import { useToastHandlerStore } from 'react-lib/src/stores/toast-handler';

const { userService } = ENV.backendAddresses;

export type ApiToken = {
  uid: string;
  name: string;
  token: string;
  hostUrl: string;
  createdAt: number;
  expires?: number;
};

export default class UserApiTokenService extends Service {
  @service('router')
  router!: any;

  retrieveApiTokens() {
    return new Promise<ApiToken[]>((resolve) => {
      const userId = encodeURI(useAuthStore.getState().user?.sub.toString() || '');
      if (!userId) {
        resolve([]);
      }

      fetch(`${userService}/userapi?uId=${useAuthStore.getState().user!.sub.toString()}`, {
        headers: {
          Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
        },
      })
        .then(async (response: Response) => {
          if (response.ok) {
            const tokens = (await response.json()) as ApiToken[];
            resolve(tokens);
          } else {
            resolve([]);
            useToastHandlerStore
              .getState()
              .showErrorToastMessage('API-Tokens could not be loaded.');
          }
        })
        .catch(async () => {
          resolve([]);
          useToastHandlerStore
            .getState()
            .showErrorToastMessage('Server for Git APIs not available.');
        });
    });
  }

  async deleteApiToken(apiToken: string, uId: string) {
    const url = `${userService}/userapi/delete?uId=${uId}&token=${apiToken}`;
    const response = await fetch(url, {
      method: 'DELETE',
    });
    if (response.ok) {
      useToastHandlerStore
        .getState()
        .showSuccessToastMessage('API-Token successfully deleted.');
    } else {
      useToastHandlerStore
        .getState()
        .showErrorToastMessage(
          'Something went wrong. API-Token could not be deleted.'
        );
    }

    this.router.refresh('settings');
  }

  async createApiToken(
    name: string,
    token: string,
    hostUrl: string,
    expDate: number | null
  ) {
    const createdAt: number = new Date().getTime();

    const url =
      expDate !== null
        ? `${userService}/userapi/create?uId=${useAuthStore.getState().user!.sub.toString()}&name=${name}&token=${token}&createdAt=${createdAt}&hostUrl=${hostUrl}&expires=${expDate}`
        : `${userService}/userapi/create?uId=${useAuthStore.getState().user!.sub.toString()}&name=${name}&token=${token}&createdAt=${createdAt}&hostUrl=${hostUrl}`;
    const response = await fetch(url, {
      method: 'POST',
    });
    if (response.ok) {
      useToastHandlerStore
        .getState()
        .showSuccessToastMessage('API-Token successfully saved.');
    } else if (response.status === 422) {
      useToastHandlerStore
        .getState()
        .showErrorToastMessage('Token is already being used.');
    } else {
      useToastHandlerStore
        .getState()
        .showErrorToastMessage(
          'Something went wrong. API-Token could not be saved.'
        );
    }
    this.router.refresh('settings');
  }
}

// Don't remove this declaration: this is what enables TypeScript to resolve
// this service using `Owner.lookup('service:user-api-token')`, as well
// as to check when you pass the service name as an argument to the decorator,
// like `@service('user-api-token') declare altName: UserApiTokenService;`.
declare module '@ember/service' {
  interface Registry {
    'user-api-token': UserApiTokenService;
  }
}
