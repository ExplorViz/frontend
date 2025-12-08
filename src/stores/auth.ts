import { create } from 'zustand';
import Keycloak from 'keycloak-js';

// --- 1. Typ-Definitionen ---
export type AuthenticatedUser = {
  name: string;
  nickname: string;
  sub: string;
};

interface AuthState {
  isInitialized: boolean; // Neu: Damit die App weiß, wann Keycloak fertig geladen hat
  isAuthenticated: boolean;
  user: AuthenticatedUser | undefined;
  accessToken: string | undefined;
  
  // Aktionen
  login: () => void;
  logout: () => void;
}

// --- 2. Keycloak Instanz erstellen (Singleton) ---
// Wir exportieren es, falls wir mal direkt auf Keycloak-Methoden zugreifen müssen
export const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL, // Am besten aus .env holen
  realm: import.meta.env.VITE_KEYCLOAK_REALM,
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
});

// --- 3. Der Store ---
export const useAuthStore = create<AuthState>((set) => ({
  isInitialized: false,
  isAuthenticated: false,
  user: undefined,
  accessToken: undefined,

  logout: () => {
    set({ user: undefined, accessToken: undefined });
    keycloak.logout({
      redirectUri : "http://localhost:8080/",
    }); // Ruft auch den Keycloak-Logout auf
  },

  login: () => {
    keycloak.login();
  }
}));

// --- 4. Der "Glue Code" (Initialisierung) ---
// Das läuft automatisch los, sobald diese Datei irgendwo importiert wird.
keycloak
  .init({ onLoad: 'check-sso' }) // Oder 'check-sso' für stillen Login
  .then((authenticated) => {
    
    if (authenticated) {
      // Mapping der Daten
      const user: AuthenticatedUser = {
        name: keycloak.tokenParsed?.name || 'Unknown',
        nickname: keycloak.tokenParsed?.preferred_username || '',
        sub: keycloak.tokenParsed?.sub || '',
      };

      // Store updaten
      useAuthStore.setState({
        isInitialized: true,
        isAuthenticated: true,
        accessToken: keycloak.token,
        user: user,
      });
    } else {
      // Nicht eingeloggt, aber Initialisierung fertig
      useAuthStore.setState({ 
        isInitialized: true,
        isAuthenticated: false,
        user: undefined 
      });
    }
  })
  .catch((err) => {
    console.error("Keycloak Init Fehler:", err);
    useAuthStore.setState({ isInitialized: true }); // Trotzdem fertig, damit App nicht hängt
  });

// Token Refresh Logik
keycloak.onTokenExpired = () => {
  keycloak.updateToken(30).then((refreshed) => {
    if (refreshed) {
      useAuthStore.setState({ accessToken: keycloak.token });
    }
  });
};