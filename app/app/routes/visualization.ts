import VisualizationController from 'explorviz-frontend/controllers/visualization';
import { Font, FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import debugLogger from 'ember-debug-logger';
import LandscapeTokenService from 'explorviz-frontend/services/landscape-token';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
// import FontRepository from 'explorviz-frontend/services/repos/font-repository';
import { useFontRepositoryStore } from 'react-lib/src/stores/repos/font-repository';
import BaseRoute from './base-route';
import SnapshotTokenService from 'explorviz-frontend/services/snapshot-token';
import { useToastHandlerStore } from 'react-lib/src/stores/toast-handler';

/**
 * TODO
 *
 * @class Visualization-Route
 * @extends Ember.Route
 */
export default class VisualizationRoute extends BaseRoute {
  @service('landscape-token')
  landscapeToken!: LandscapeTokenService;

  @service('snapshot-token')
  snapshotService!: SnapshotTokenService;

  @service('router')
  router!: any;

  // @service('repos/font-repository')
  // fontRepo!: FontRepository;

  debug = debugLogger();

  async beforeModel() {
    if (
      this.landscapeToken.token === null &&
      this.snapshotService.snapshotToken === null &&
      !this.snapshotService.snapshotSelected
    ) {
      this.router.transitionTo('landscapes');
      return Promise.resolve();
    }
    // load font for labels
    // const controller = this.controllerFor('visualization') as VisualizationController;
    // TODO maybe not the best place here
    if (!useFontRepositoryStore.getState().font) {
      const font = await this.loadFont();

      useFontRepositoryStore.getState().font = font;
      // controller.set('font', font);
    }
    // handle auth0 authorization
    return super.beforeModel();
  }

  private async loadFont(): Promise<Font> {
    return new Promise((resolve, reject) => {
      new FontLoader().load(
        // resource URL
        '/three.js/fonts/roboto_mono_bold_typeface.json',

        // onLoad callback
        (font) => {
          resolve(font);
          this.debug('(THREE.js) font sucessfully loaded.');
        },
        undefined,
        (e) => {
          reject(e);
          this.debug('(THREE.js) font failed to load.');
        }
      );
    });
  }

  @action
  error(error: any) {
    if (error instanceof ProgressEvent) {
      useToastHandlerStore
        .getState()
        .showErrorToastMessage('Failed to load font for labels.');
      return true;
    }
    return super.error(error);
  }

  // @Override Ember-Hook
  /* eslint-disable-next-line class-methods-use-this */
  resetController(
    controller: VisualizationController,
    isExiting: boolean /* , transition: any */
  ) {
    if (isExiting) {
      this.landscapeToken.removeToken();

      controller.willDestroy();
    }
  }
}
