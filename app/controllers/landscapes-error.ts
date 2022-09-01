import Controller from '@ember/controller';
import { action } from '@ember/object';

export default class LandscapesError extends Controller {
  @action
  refresh() {
    this.transitionToRoute('landscapes');
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your controllers.
declare module '@ember/controller' {
  interface Registry {
    'landscapes-error': LandscapesError;
  }
}
