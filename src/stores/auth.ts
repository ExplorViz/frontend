import { isLoginSkipped } from 'explorviz-frontend/src/utils/auth-config';
import Keycloak from 'keycloak-js';
import { create } from 'zustand';

export type AuthenticatedUser = {
  name: string;
  nickname: string;
  sub: string;
};

interface AuthState {
  isInitialized: boolean;
  isAuthenticated: boolean;
  user: AuthenticatedUser | undefined;
  accessToken: string | undefined;

  // Actions
  login: () => void;
  logout: () => void;
  skipLogin: () => void;
}

// Check if skip login is enabled via environment variable
const isSkipLoginEnabled = isLoginSkipped();

// Default development user credentials from environment variables
const getDefaultUser = (): AuthenticatedUser => ({
  name: import.meta.env.VITE_DEV_USER_NAME || 'Development User',
  nickname: import.meta.env.VITE_DEV_USER_NICKNAME || 'dev-user',
  sub: import.meta.env.VITE_DEV_USER_SUB || '9000',
});

const getDefaultAccessToken = (): string => import.meta.env.VITE_DEV_ACCESS_TOKEN || 'dev-token';

export const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL || window.location.origin,
  realm: import.meta.env.VITE_KEYCLOAK_REALM,
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
});

export const useAuthStore = create<AuthState>((set) => ({
  isInitialized: false,
  isAuthenticated: false,
  user: undefined,
  accessToken: undefined,

  logout: () => {
    set({ user: undefined, accessToken: undefined });
    if (!isSkipLoginEnabled) {
      keycloak.logout({
        redirectUri: import.meta.env.VITE_KEYCLOAK_REDIRECT_URI || `${window.location.origin}/`,
      });
    }
  },

  login: () => {
    if (!isSkipLoginEnabled) {
      keycloak.login();
    }
  },

  skipLogin: () => {
    // Set a default development user from environment variables
    set({
      isInitialized: true,
      isAuthenticated: true,
      user: getDefaultUser(),
      accessToken: getDefaultAccessToken(),
    });
  },
}));

// If skip login is enabled, immediately set auth state without Keycloak initialization
if (isSkipLoginEnabled) {
  useAuthStore.setState({
    isInitialized: true,
    isAuthenticated: true,
    user: getDefaultUser(),
    accessToken: getDefaultAccessToken(),
  });
} else {
  // Only initialize Keycloak if skip login is not enabled
  keycloak
    .init({ onLoad: 'check-sso' })
    .then((authenticated) => {
      if (authenticated) {
        const user: AuthenticatedUser = {
          name: keycloak.tokenParsed?.name || 'Unknown',
          nickname: keycloak.tokenParsed?.preferred_username || '',
          sub: keycloak.tokenParsed?.sub || '',
        };

        useAuthStore.setState({
          isInitialized: true,
          isAuthenticated: true,
          accessToken: keycloak.token,
          user: user,
        });
      } else {
        useAuthStore.setState({
          isInitialized: true,
          isAuthenticated: false,
          user: undefined,
        });
      }
    })
    .catch((err) => {
      console.error('Keycloak Init Fehler:', err);
      useAuthStore.setState({ isInitialized: true });
    });

  // Set up token expiration handler only when using Keycloak
  keycloak.onTokenExpired = () => {
    keycloak.updateToken(30).then((refreshed) => {
      if (refreshed) {
        useAuthStore.setState({ accessToken: keycloak.token });
      }
    });
  };
}

/**
 * The access token, refreshed first if it expires within `minValidity` seconds.
 * For a service that checks the token once, e.g. when joining a collaboration Room.
 */
export async function freshAccessToken(minValidity = 30): Promise<string | undefined> {
  if (!isLoginSkipped() && keycloak.authenticated) {
    try {
      if (await keycloak.updateToken(minValidity)) {
        useAuthStore.setState({ accessToken: keycloak.token });
      }
    } catch (error) {
      console.error('Could not refresh the login token:', error);
    }
  }
  return useAuthStore.getState().accessToken;
}
