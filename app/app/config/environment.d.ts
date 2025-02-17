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
  backendAddresses: {
    shareSnapshot: string;
    gitlabApi: string;
    spanService: string;
    userService: string;
    vsCodeService: string;
    collaborationService: string;
    metricsService: string;
    codeService: string;
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
