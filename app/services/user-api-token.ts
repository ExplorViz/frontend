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
              'API-Tokens could not be laoded.'
            );
          }
        })
        .catch(async () => {
          resolve([]);
          this.toastHandler.showErrorToastMessage('Server not available.');
        });
    });

    // if (ENV.auth0.enabled === 'false') {
    //   // make api call to DB, but not authorished, give a standard uId to Johnny?

    //   return [
    //     {
    //       uId: 'Testname',
    //       name: 'GitLab Api Token',
    //       token: 'apiToken123',
    //       createdAt: 1714940718,
    //       expires: 1770323118,
    //     },
    //     {
    //       uId: 'Testname 2',
    //       name: 'GitHub Api Token',
    //       token: 'apiToken1234',
    //       createdAt: 19071647189,
    //       expires: 1938787198,
    //     },
    //   ];
    // } else {
    //   // make api call to DB but authorized
    //   return [
    //     {
    //       uId: 'testname 3',
    //       name: 'GitLab Api Token',
    //       token: 'apiToken123',
    //       createdAt: 1234,
    //       expires: 123456,
    //     },
    //   ];
    // }
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
