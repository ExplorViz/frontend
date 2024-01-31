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
    spanService: string;
    userService: string;
    vsCodeService: string;
    collaborationService: string;
    metricService: string;
  };
  version: {
    versionTag: P_ENV.VERSION_TAG;
  };
  mode: {
    tokenToShow: string;
  };
  APP: any;
};

export default config;
