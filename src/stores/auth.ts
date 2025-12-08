import { create } from 'zustand';
import Keycloak from 'keycloak-js';

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
  
  // Aktionen
  login: () => void;
  logout: () => void;
}

export const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL,
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
    keycloak.logout({
      redirectUri : "http://localhost:8080/",
    });
  },

  login: () => {
    keycloak.login();
  }
}));

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
        user: undefined 
      });
    }
  })
  .catch((err) => {
    console.error("Keycloak Init Fehler:", err);
    useAuthStore.setState({ isInitialized: true });
  });

keycloak.onTokenExpired = () => {
  keycloak.updateToken(30).then((refreshed) => {
    if (refreshed) {
      useAuthStore.setState({ accessToken: keycloak.token });
    }
  });
};