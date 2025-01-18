import { createStore } from 'zustand/vanilla';
import { Auth0Error, Auth0UserProfile } from 'auth0-js';
import Auth0Lock from 'auth0-lock';
import eventEmitter from 'react-lib/src/utils/event-emitter';
import ENV from 'explorviz-frontend/config/environment';

// TODO: Wait for router to be migrated

interface AuthState {
    lock: Auth0LockStatic | null; // TODO: It is private in service, what to do?
    user: Auth0UserProfile | undefined;
    accessToken: string | undefined;
    // initAuthentication: () => void;
    // isDevMode: () => Promise<boolean>;
    // initAuthLock: () => void;
    // login: () =>void;
    // setUser: (token: string) => Promise<Auth0UserProfile>;
    // checkLogin: () => Promise<unknown>;
    // logout: () => void;
}

export const useAuthStore = createStore<AuthState>((set, get) => ({
    lock: null,
    user: undefined,
    accessToken: undefined,

  //   initAuthentication: async () => {
  //     // No auth in dev mode
  //     const noAuth = await get().isDevMode();
  
  //     if (noAuth) {
  //       set({ user: ENV.auth0.profile });
  //       set({ accessToken: ENV.auth0.accessToken });
  //       eventEmitter.emit('user_authenticated', get().user);
  //     } else {
  //       get().initAuthLock();
  //     }
  //   },

  //   isDevMode: async () => {
  //     return (
  //       ENV.auth0.enabled === 'false' ||
  //       sessionStorage.getItem('no-auth') === 'true'
  //     );
  //   },

  //   initAuthLock: () => {
  //     set({ lock: new Auth0Lock(ENV.auth0.clientId, ENV.auth0.domain, {
  //       auth: {
  //         redirectUrl: ENV.auth0.callbackUrl,
  //         audience: `https://${ENV.auth0.domain}/api/v2/`,
  //         responseType: 'token',
  //         params: {
  //           scope: 'openid profile',
  //         },
  //         autoParseHash: true,
  //       },
  //       container: 'auth0-login-container',
  //       theme: {
  //         logo: ENV.auth0.logoUrl,
  //       },
  //       closable: false,
  //       languageDictionary: {
  //         title: 'ExplorViz',
  //       },
  //     }) });
  
  //     // TODO: on from AUTH LOCK or Evented?
  //     get().lock.on('authenticated', async (authResult) => {
  //       await get().setUser(authResult.accessToken);
  
  //       get().accessToken = authResult.accessToken;
  //       this.router.transitionTo(ENV.auth0.routeAfterLogin);
  //     });
  //   },

  //   /**
  //  * Send a user over to the hosted auth0 login page
  //  */
  // login: () => {
  //   // Since testem seems to enter routes but not render their templates,
  //   // the login container does not necessarily exist, which results in an error
  //   if (!document.getElementById('auth0-login-container')) {
  //     this.router.transitionTo('login');
  //     return;
  //   }
  //   if (get().lock) {
  //     get().lock.show();
  //   } else {
  //     this.router.transitionTo(ENV.auth0.routeAfterLogin);
  //   }
  // },

  // /**
  //  * Use the token to set our user
  //  */
  // setUser: (token: string) => {
  //   // Once we have a token, we are able to go get the users information
  //   return new Promise<Auth0UserProfile>((resolve, reject) => {
  //     if (get().lock) {
  //       get().lock.getUserInfo(
  //         token,
  //         (_err: Auth0Error, profile: Auth0UserProfile) => {
  //           if (_err) {
  //             reject(_err);
  //           } else {
  //             get().user = profile;
  //             resolve(profile);
  //           }
  //         }
  //       );
  //     } else {
  //       // no-auth
  //       set({ user: ENV.auth0.profile });
  //       resolve(ENV.auth0.profile);
  //     }
  //   });
  // },

  // /**
  //  * Check if we are authenticated using the auth0 library's checkSession
  //  */
  // checkLogin: async () => {
  //   if (!get().user) {
  //     await get().initAuthentication();
  //   }

  //   // check to see if a user is authenticated, we'll get a token back
  //   return new Promise((resolve, reject) => {
  //     if (get().lock) {
  //       // Silent authentication can cause problems with Safari:
  //       // https://auth0.com/docs/troubleshoot/authentication-issues/renew-tokens-when-using-safari
  //       get().lock.checkSession({}, async (err, authResult) => {
  //         if (err || authResult === undefined) {
  //           // Try to use existing user data when silent (re-)authentication failed
  //           if (get().user) {
  //             resolve(get().user);
  //           } else {
  //             reject(err);
  //           }
  //         } else {
  //           try {
  //             await get().setUser(authResult.accessToken);
  //             set({ accessToken: authResult.accessToken });
  //             resolve(authResult);
  //             eventEmitter.emit('user_authenticated', get().user);
  //           } catch (e) {
  //             reject(e);
  //           }
  //         }
  //       });
  //     } else {
  //       // No authentication
  //       set({ user: ENV.auth0.profile });
  //       set({ accessToken: ENV.auth0.accessToken });
  //       resolve({});
  //     }
  //   });
  // },

  // /**
  //  * Get rid of everything in sessionStorage that identifies this user
  //  */
  // logout: () => {
  //   set({ user: undefined });
  //   set({ accessToken: undefined });
  //   sessionStorage.setItem('no-auth', 'false');
  //   if (get().lock) {
  //     get().lock.logout({
  //       clientID: ENV.auth0.clientId,
  //       returnTo: ENV.auth0.logoutReturnUrl,
  //     });
  //   } else {
  //     this.router.transitionTo('login');
  //   }
  // },
}
}));

