import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
//import type VisualizationController from 'explorviz-frontend/controllers/visualization';
import type VisualizationController from '../../../app/controllers/visualization';

module('Unit | Controller', function (hooks) {
  setupTest(hooks);

  // Replace this with your real tests.
  test('it exists', function (assert) {
    const controller = this.owner.lookup('controller:visualization') as VisualizationController;
    controller.setupListeners();
    assert.ok(controller);
  });
});
