import { Auth0UserProfile } from 'auth0-js';

/**
 * Type declarations for
 *    import config from './config/environment'
 *
 * For now these need to be managed by the developer
 * since different ember addons can materialize new entries.
 */
declare const config: {
  environment: any;
  modulePrefix: string;
  podModulePrefix: string;
  locationType: string;
  rootURL: string;
  auth0: {
    enabled: string;
    clientId: string;
    domain: string;
    logoUrl: string;
    callbackUrl: string;
    logoutReturnUrl: string;
    routeAfterLogin: string;
    accessToken: string;
    profile: Auth0UserProfile;
  };
  backendAddresses: {
    landscapeService: string;
    traceService: string;
    userService: string;
    vsCodeService: string;
    collaborativeService: string;
    collaborationService: string;
    collaborationSocketPath: string;
  };
  version: {
    versionTag: P_ENV.VERSION_TAG;
  };
  mode: {
    tokenToShow: string;
    collabRoomToJoin: string;
  };
  APP: any;
};

export default config;
