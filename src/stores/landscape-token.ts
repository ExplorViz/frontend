import { useAuthStore } from 'explorviz-frontend/src/stores/auth';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import { create } from 'zustand';

const userService = import.meta.env.VITE_USER_SERV_URL;
const tokenToShow = import.meta.env.VITE_ONLY_SHOW_TOKEN;

interface LandscapeTokenState {
  token: LandscapeToken | null;
  _constructor: () => void;
  restoreSingleLandscapeToken: () => void;
  retrieveTokens: () => Promise<LandscapeToken[]>;
  setToken: (token: LandscapeToken | null) => void;
  setTokenByValue: (tokenValue: string) => Promise<void>;
  removeToken: () => void;
  _isValidToken: (token: unknown) => token is LandscapeToken;
  _isStringArray: (possibleArray: unknown) => possibleArray is string[];
  _isObject: (variable: unknown) => variable is object;
}

export type LandscapeToken = {
  alias: string;
  created: number;
  ownerId: string;
  secret?: string;
  isRequestedFromVSCodeExtension: boolean;
  projectName: string;
  commitId: string;
  sharedUsersIds: string[];
  value: string;
};

export const useLandscapeTokenStore = create<LandscapeTokenState>(
  (set, get) => ({
    token: null, // tracked

    _constructor: () => {
      get().restoreSingleLandscapeToken();
    },

    restoreSingleLandscapeToken: () => {
      if (!tokenToShow || tokenToShow === 'change-token') {
        return;
      }

      const singleLandscapeToken = {
        value: tokenToShow,
        ownerId: 'github|123456',
        created: 1589876888000,
        alias: '',
        sharedUsersIds: [],
      };

      if (get()._isValidToken(singleLandscapeToken)) {
        set({ token: singleLandscapeToken });
      } else {
        get().removeToken();
      }
    },

    retrieveTokens: async () => {
      return new Promise<LandscapeToken[]>((resolve, reject) => {
        const userId = encodeURI(useAuthStore.getState().user?.sub || '');
        if (!userId) {
          resolve([]);
        }

        fetch(`${userService}/user/${userId}/token`, {
          headers: {
            Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
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
            useToastHandlerStore
              .getState()
              .showErrorToastMessage('Server for landscapes not available.');
          });
      });
    },

    setToken: (token: LandscapeToken | null) => {
      if (token && token.value === get().token?.value) {
        return;
      }

      set({ token: token });
    },

    setTokenByValue: async (tokenValue: string) => {
      const tokens = await get().retrieveTokens();
      const token = tokens.find((t) => t.value === tokenValue);
      if (token) {
        get().setToken(token);
      }
    },

    removeToken: () => {
      set({ token: null });
    },

    _isValidToken: (token: unknown): token is LandscapeToken => {
      return (
        get()._isObject(token) &&
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
        get()._isStringArray((<LandscapeToken>token).sharedUsersIds) &&
        typeof (<LandscapeToken>token).value === 'string'
      );
    },

    _isStringArray: (possibleArray: unknown) => {
      return (
        Array.isArray(possibleArray) &&
        possibleArray.every((item) => typeof item === 'string')
      );
    },

    _isObject: (variable: unknown): variable is object => {
      return Object.prototype.toString.call(variable) === '[object Object]';
    },
  })
);

useLandscapeTokenStore.getState()._constructor();
