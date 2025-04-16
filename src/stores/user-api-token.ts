import { create } from 'zustand';
import { useAuthStore } from './auth';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';

const userService = import.meta.env.VITE_USER_SERV_URL;

export type ApiToken = {
  uid: string;
  name: string;
  token: string;
  hostUrl: string;
  createdAt: number;
  expires?: number;
};

interface UserApiTokenState {
  retrieveApiTokens: () => Promise<ApiToken[]>;
  deleteApiToken: (apiToken: string, uId: string) => Promise<void>;
  createApiToken: (
    name: string,
    token: string,
    hostUrl: string,
    expDate: number | null
  ) => Promise<void>;
}

export const useUserApiTokenStore = create<UserApiTokenState>(() => ({
  retrieveApiTokens: () => {
    return new Promise<ApiToken[]>((resolve) => {
      const userId = encodeURI(useAuthStore.getState().user?.sub || '');
      if (!userId) {
        resolve([]);
      }

      fetch(`${userService}/userapi?uId=${useAuthStore.getState().user!.sub}`, {
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
  },

  deleteApiToken: async (apiToken: string, uId: string) => {
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
  },

  createApiToken: async (
    name: string,
    token: string,
    hostUrl: string,
    expDate: number | null
  ) => {
    const createdAt: number = new Date().getTime();

    const url =
      expDate !== null
        ? `${userService}/userapi/create?uId=${useAuthStore.getState().user!.sub}&name=${name}&token=${token}&createdAt=${createdAt}&hostUrl=${hostUrl}&expires=${expDate}`
        : `${userService}/userapi/create?uId=${useAuthStore.getState().user!.sub}&name=${name}&token=${token}&createdAt=${createdAt}&hostUrl=${hostUrl}`;
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
  },
}));
