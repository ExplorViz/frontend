import EmberRouter from '@ember/routing/router';
import config from 'explorviz-frontend/config/environment';

export default class Router extends EmberRouter {
  location = config.locationType;
  rootURL = config.rootURL;
}

Router.map(() => {
  this.route('badroute', { path: '/*path' });
  this.route('login');
  this.route('callback');
  this.route('visualization');
  this.route('landscapes');
});
