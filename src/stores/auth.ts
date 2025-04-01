import { create } from 'zustand';

interface AuthState {
  user: AuthenticatedUser | undefined;
  accessToken: string | undefined;
}

export const useAuthStore = create<AuthState>((/*set, get*/) => ({
  user: {
    name: import.meta.env.VITE_AUTH_DISABLED_PROFILE_NAME,
    nickname: import.meta.env.VITE_AUTH_DISABLED_NICKNAME,
    sub: import.meta.env.VITE_AUTH_DISABLED_SUB,
  },
  accessToken: import.meta.env.VITE_AUTH_DISABLED_ACCESS_TOKEN,
}));

export type AuthenticatedUser = {
  name: string;
  nickname: string;
  sub: string;
};
