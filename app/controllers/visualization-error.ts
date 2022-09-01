import Controller from '@ember/controller';
import { action } from '@ember/object';

export default class VisualizationError extends Controller {
  @action
  refresh() {
    this.transitionToRoute('visualization');
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your controllers.
declare module '@ember/controller' {
  interface Registry {
    'visualization-error': VisualizationError;
  }
}
