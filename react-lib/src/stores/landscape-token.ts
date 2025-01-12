import { createStore } from 'zustand/vanilla';

interface LandscapeTokenState {
    token: LandscapeToken | null;
}

export type LandscapeToken = {
    alias: string;
    created: number;
    ownerId: string;
    secret?: string;
    sharedUsersIds: string[];
    value: string;
  };


export const useLandscapeTokenStore = createStore<LandscapeTokenState>(() => ({
    token: null,
}));
