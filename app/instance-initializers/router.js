import Router from 'explorviz-frontend/router';

/**
* Extending the Ember router for mapping nested routes under configuration from extensions.
*
* @class Router
* @extends Ember.Router
*
* @module ember
*/
export function initialize(/* appInstance */) {
  Router.configurationRouteExtensions = [];
}

export default {
  name: 'router',
  initialize,
};
