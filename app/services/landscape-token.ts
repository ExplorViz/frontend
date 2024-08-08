/* eslint-disable class-methods-use-this */
import Service, { inject as service } from '@ember/service';
import debugLogger from 'ember-debug-logger';
import { tracked } from '@glimmer/tracking';
import ENV from 'explorviz-frontend/config/environment';
import Auth from 'explorviz-frontend/services/auth';
const { userService } = ENV.backendAddresses;

export type LandscapeToken = {
  alias: string;
  created: number;
  ownerId: string;
  secret?: string;
  sharedUsersIds: string[];
  value: string;
};

const tokenToShow = ENV.mode.tokenToShow;

export default class LandscapeTokenService extends Service {
  private readonly debug = debugLogger('LandscapeTokenService');

  @service('auth')
  private auth!: Auth;

  @tracked
  token: LandscapeToken | null = null;

  // Used in landscape selection to go back to last selected token
  @tracked
  latestToken: LandscapeToken | null = null;

  constructor() {
    super(...arguments);

    this.restoreToken();
  }

  restoreToken() {
    let parsedToken;

    if (tokenToShow && tokenToShow !== 'change-token') {
      parsedToken = {
        value: tokenToShow,
        ownerId: 'github|123456',
        created: 1589876888000,
        alias: '',
        sharedUsersIds: [],
      };
    } else {
      const currentLandscapeTokenJSON = localStorage.getItem(
        'currentLandscapeToken'
      );

      if (currentLandscapeTokenJSON === null) {
        this.set('token', null);
        return;
      }

      parsedToken = JSON.parse(currentLandscapeTokenJSON);
    }

    if (this.isValidToken(parsedToken)) {
      this.set('token', parsedToken);
    } else {
      this.removeToken();
    }
  }

  retrieveTokens() {
    return new Promise<LandscapeToken[]>((resolve, reject) => {
      const userId = encodeURI(this.auth.user?.sub || '');
      if (!userId) {
        resolve([]);
      }

      fetch(`${userService}/user/${userId}/token`, {
        headers: {
          Authorization: `Bearer ${this.auth.accessToken}`,
        },
      })
        .then(async (response: Response) => {
          if (response.ok) {
            const tokens = (await response.json()) as LandscapeToken[];
            resolve(tokens);
          } else {
            reject();
          }
        })
        .catch(async (e) => {
          reject(e);
        });
    });
  }

  setToken(token: LandscapeToken | null) {
    if (token && token.value === this.token?.value) {
      return;
    }

    // Update references to landscape tokens
    localStorage.setItem('currentLandscapeToken', JSON.stringify(token));
    if (this.token) {
      this.latestToken = this.token;
    }

    this.token = token;

    if (token) {
      this.debug(`Set landscape token to " ${token.alias || token.value}"`);
    }
  }

  async setTokenByValue(tokenValue: string) {
    const tokens = await this.retrieveTokens();
    const token = tokens.find((t) => t.value === tokenValue);
    if (token) {
      this.setToken(token);
    }
  }

  removeToken() {
    localStorage.removeItem('currentLandscapeToken');
    this.set('token', null);
  }

  private isValidToken(token: unknown): token is LandscapeToken {
    return (
      this.isObject(token) &&
      Object.keys(token).length === 5 &&
      {}.hasOwnProperty.call(token, 'alias') &&
      {}.hasOwnProperty.call(token, 'created') &&
      {}.hasOwnProperty.call(token, 'ownerId') &&
      {}.hasOwnProperty.call(token, 'sharedUsersIds') &&
      {}.hasOwnProperty.call(token, 'value') &&
      (!{}.hasOwnProperty.call(token, 'secret') ||
        typeof (<LandscapeToken>token).secret === 'string') &&
      typeof (<LandscapeToken>token).alias === 'string' &&
      typeof (<LandscapeToken>token).created === 'number' &&
      typeof (<LandscapeToken>token).ownerId === 'string' &&
      this.isStringArray((<LandscapeToken>token).sharedUsersIds) &&
      typeof (<LandscapeToken>token).value === 'string'
    );
  }

  private isStringArray(possibleArray: unknown) {
    return (
      Array.isArray(possibleArray) &&
      possibleArray.every((item) => typeof item === 'string')
    );
  }

  private isObject(variable: unknown): variable is object {
    return Object.prototype.toString.call(variable) === '[object Object]';
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'landscape-token': LandscapeTokenService;
  }
}
