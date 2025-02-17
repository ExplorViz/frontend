/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

const DOTENV = require('dotenv');
const DOTENV_EXPAND = require('dotenv-expand');

module.exports = (environment) => {
  const path = { path: process.env.DOTENV };

  const P_ENV = process.env;

  // Custom DOTENV file, e.g., "DOTENV=.env-custom ember s"
  if (P_ENV.DOTENV) {
    const dotEnvConfig = DOTENV_EXPAND.expand(DOTENV.config(path));
    // Detect and output errors when loading a config, e.g. a missing file
    if (dotEnvConfig.error) {
      throw (
        new Error(
          'Could not find .env-custom file. Did you follow the development instructions?\n'
        ) + dotEnvConfig.error
      );
    }
  } else if (environment === 'production') {
    DOTENV_EXPAND.expand(DOTENV.config({ path: '.env-prod' }));
  } else {
    // Development, use .env file
    DOTENV_EXPAND.expand(DOTENV.config());
  }

  const ENV = {
    modulePrefix: 'explorviz-frontend',
    environment,
    rootURL: '/',
    locationType: 'history',
    EmberENV: {
      EXTEND_PROTOTYPES: true,
      FEATURES: {
        // Here you can enable experimental features on an ember canary build
        // e.g. 'with-controller': true
      },
    },
    backendAddresses: {
      spanService: P_ENV.SPAN_SERV_URL,
      userService: P_ENV.USER_SERV_URL,
      vsCodeService: P_ENV.VSCODE_SERV_URL,
      collaborationService: P_ENV.COLLABORATION_SERV_URL,
      shareSnapshot: P_ENV.SHARE_SNAPSHOT_URL,
      gitlabApi: P_ENV.GITLAB_API,
      metricsService: P_ENV.METRICS_SERV_URL,
      codeService: P_ENV.CODE_SERV_URL,
    },
    version: {
      versionTag: P_ENV.VERSION_TAG,
    },
    mode: {
      tokenToShow: P_ENV.ONLY_SHOW_TOKEN,
    },
    APP: {
      // Here you can pass flags/options to your application instance
      // when it is created
    },
  };

  if (environment === 'test') {
    // Testem prefers this...
    ENV.locationType = 'none';

    ENV.APP.autoboot = false;

    // keep test console output quieter
    ENV.APP.LOG_ACTIVE_GENERATION = false;
    ENV.APP.LOG_VIEW_LOOKUPS = false;

    ENV.APP.rootElement = '#ember-testing';
  }

  return ENV;
};
