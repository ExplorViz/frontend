/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

const DOTENV = require('dotenv');

module.exports = (environment) => {
  const path = { path: process.env.DOTENV };

  const P_ENV = process.env;

  // custom DOTENV file, e.g., "DOTENV=.env-custom ember s"
  if (P_ENV.DOTENV) {
    DOTENV.config(path);
  } else if (environment === 'production') {
    DOTENV.config({ path: '.env-prod' });
  } else {
    // Development, use .env file
    DOTENV.config();
  }

  const ENV = {
    modulePrefix: 'explorviz-frontend',
    environment,
    rootURL: '/',
    locationType: 'history',
    EmberENV: {
      FEATURES: {
        // Here you can enable experimental features on an ember canary build
        // e.g. 'with-controller': true
      },
      EXTEND_PROTOTYPES: {
        // Prevent Ember Data from overriding Date.parse.
        Date: false,
      },
    },
    auth0: {
      enabled: P_ENV.AUTH0_ENABLED,
      clientId: P_ENV.AUTH0_CLIENT_ID,
      domain: P_ENV.AUTH0_DOMAIN,
      logoUrl: P_ENV.AUTH0_LOGO_URL,
      callbackUrl: P_ENV.AUTH0_CALLBACK_URL,
      logoutReturnUrl: P_ENV.AUTH0_LOGOUT_URL,
      routeAfterLogin: P_ENV.AUTH0_ROUTE_AFTER_LOGIN,
      accessToken: P_ENV.AUTH0_DISABLED_ACCESS_TOKEN,
      profile: {
        name: P_ENV.AUTH0_DISABLED_PROFILE_NAME,
        nickname: P_ENV.AUTH0_DISABLED_NICKNAME,
        sub: P_ENV.AUTH0_DISABLED_SUB,
      },
    },
    backendAddresses: {
      landscapeService: P_ENV.LANDSCAPE_SERV_URL,
      traceService: P_ENV.TRACE_SERV_URL,
      userService: P_ENV.USER_SERV_URL,
      vsCodeService: P_ENV.VSCODE_SERV_URL,
      collaborationService: P_ENV.COLLABORATION_SERV_URL,
      collaborationSocketPath: P_ENV.COLLABORATION_SOCKET_PATH,
    },
    version: {
      versionTag: P_ENV.VERSION_TAG,
    },
    mode: {
      tokenToShow: P_ENV.ONLY_SHOW_TOKEN,
      collabRoomToJoin: P_ENV.JOIN_COLLAB_ROOM,
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
