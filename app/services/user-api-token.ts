import Service, { inject as service } from '@ember/service';
import Auth from './auth';
import ToastHandlerService from './toast-handler';
import ENV from 'explorviz-frontend/config/environment';
// import { action } from '@ember/object';

const { userServiceApi } = ENV.backendAddresses;

export type ApiToken = {
  uid: string;
  name: string;
  token: string;
  createdAt: number;
  expires?: number;
};

export default class UserApiTokenService extends Service {
  @service('auth')
  private auth!: Auth;

  @service('router')
  router!: any;

  @service('toast-handler')
  toastHandler!: ToastHandlerService;

  /**
   * TODO: actual DB call
   * @returns
   */
  retrieveApiTokens() {
    return new Promise<ApiToken[]>((resolve) => {
      const userId = encodeURI(this.auth.user?.sub || '');
      if (!userId) {
        resolve([]);
      }

      fetch(`${userServiceApi}/userapi`, {
        headers: {
          Authorization: `Bearer ${this.auth.accessToken}`,
        },
      })
        .then(async (response: Response) => {
          if (response.ok) {
            const tokens = (await response.json()) as ApiToken[];
            resolve(tokens);
          } else {
            resolve([]);
            this.toastHandler.showErrorToastMessage(
              'API-Tokens could not be loaded.'
            );
          }
        })
        .catch(async () => {
          resolve([]);
          this.toastHandler.showErrorToastMessage('Server not available.');
        });
    });
  }

  async deleteApiToken(apiToken: string, uId: string) {
    const url = `${userServiceApi}/userapi/delete?uId=${uId}&token=${apiToken}`;
    const response = await fetch(url, {
      method: 'DELETE',
    });
    if (response.ok) {
      this.toastHandler.showSuccessToastMessage(
        'API-Token successfully deleted.'
      );
    } else {
      this.toastHandler.showErrorToastMessage(
        'Something went wrong. API-Token could not be deleted.'
      );
    }

    this.router.refresh('settings');
  }

  async createApiToken(name: string, token: string, expDate: number | null) {
    const createdAt: number = new Date().getTime();

    const url =
      expDate !== null
        ? `${userServiceApi}/userapi/create?uId=${this.auth.user!.sub}&name=${name}&token=${token}&createdAt=${createdAt}&expires=${expDate}`
        : `${userServiceApi}/userapi/create?uId=${this.auth.user!.sub}&name=${name}&token=${token}&createdAt=${createdAt}`;
    const response = await fetch(url, {
      method: 'POST',
    });
    if (response.ok) {
      this.toastHandler.showSuccessToastMessage(
        'API-Token successfully saved.'
      );
    } else if (response.status === 422) {
      this.toastHandler.showErrorToastMessage('Token is already being used.');
    } else {
      this.toastHandler.showErrorToastMessage(
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
