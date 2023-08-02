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
    assert.equal(controller.testQueryParameter, 'Testing Query Parameters');
    // Log the default values
    console.log('Category:', controller.testQueryParameter);

    // Modify the tracked properties
    controller.testQueryParameter= 'Modified !!!!111oneeleven';
    // Log the updated values
    console.log('Updated Category:', controller.testQueryParameter);
    // Check the updated values
    assert.equal(controller.testQueryParameter, 'Modified !!!!111oneeleven');
  });
});
