import { createStore } from 'zustand/vanilla';
import { Auth0UserProfile } from 'auth0-js';

interface AuthState {
    lock: Auth0LockStatic | null; // TODO: It is private in service, what to do?
    user: Auth0UserProfile | undefined;
    accessToken: string | undefined;
}

export const useAuthStore = createStore<AuthState>(() => ({
    lock: null,
    user: undefined,
    accessToken: undefined,
}));

