import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import landscapes from '../../../app/controllers/landscapes';

module('Unit | Controller | landscapes', function (hooks) {
  setupTest(hooks);

  // Replace this with your real tests.
  test('it exists', function (assert) {
    const controller = this.owner.lookup('controller:landscapes');
    assert.ok(controller);
  });

  test('queryParams are tracked', function(assert) {
    const controller = this.owner.lookup('controller:landscapes') as landscapes;

    // Check the default values
    assert.equal(controller.synchronization, 'false');
    // Modify the tracked properties
    controller.synchronization = 'true';
    // Check the updated values
    assert.equal(controller.synchronization, 'true');
  });
});
