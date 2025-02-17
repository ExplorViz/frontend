import { createStore } from 'zustand/vanilla';
// TODO: Wait for router to be migrated

interface AuthState {
  user: any;
  accessToken: string | undefined;
  // login: () =>void;
  // checkLogin: () => Promise<unknown>;
  // logout: () => void;
}

export const useAuthStore = createStore<AuthState>((set, get) => ({
  user: {
    name: 'Jessy Doe',
    nickname: 'Jessy',
    sub: 42,
  },
  accessToken: 'SPECIAL_TOKEN',

  // login: () => {
  //     this.router.transitionTo("landscapes");
  //   }
  // },

  // /**
  //  * Check if we are authenticated
  //  */
  // checkLogin: async () => {
  //   return;
  //   }

  // /**
  //  * Get rid of everything in sessionStorage that identifies this user
  //  */
  // logout: () => {
  //   return;
  // },
  // }
}));

export type AuthenticatedUser = {
  name: string;
  nickname: string;
  sub: number;
};
