import { createStore } from "zustand/vanilla";

export type ApiToken = {
  uid: string;
  name: string;
  token: string;
  hostUrl: string;
  createdAt: number;
  expires?: number;
};

interface UserApiTokenState {
  retrieveApiTokens: () => void;
  deleteApiToken: (apiToken: string, uId: string) => Promise<void>;
  createApiToken: (
    name: string,
    token: string,
    hostUrl: string,
    expDate: number | null
  ) => Promise<void>;
}

export const useUserApiTokenStore = createStore<UserApiTokenState>(() => ({
  retrieveApiTokens: () => {
    // TODO implement me!
  },
  deleteApiToken: async (apiToken: string, uId: string) => {
    // TODO implement me!
  },
  createApiToken: async (
    name: string,
    token: string,
    hostUrl: string,
    expDate: number | null
  ) => {
    // TODO implement me!
  },
}));
