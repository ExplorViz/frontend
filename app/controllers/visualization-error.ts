import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class VisualizationError extends Controller {

  @service('router')
  router!: any;

  @action
  refresh() {
    this.router.transitionToRoute('visualization');
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your controllers.
declare module '@ember/controller' {
  interface Registry {
    'visualization-error': VisualizationError;
  }
}
