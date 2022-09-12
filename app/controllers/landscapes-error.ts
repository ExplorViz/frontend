import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class LandscapesError extends Controller {

  @service('router')
  router!: any;

  @action
  refresh() {
    this.router.transitionTo('landscapes');
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your controllers.
declare module '@ember/controller' {
  interface Registry {
    'landscapes-error': LandscapesError;
  }
}
