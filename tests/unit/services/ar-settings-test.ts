import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

module('Unit | Service | ar-settings', function (hooks) {
  setupTest(hooks);

  // Replace this with your real tests.
  test('it exists', function (assert) {
    const service = this.owner.lookup('service:ar-settings');
    assert.ok(service);
  });
});
