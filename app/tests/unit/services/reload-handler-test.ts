import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

module('Unit | Service | reload-handler', function (hooks) {
  setupTest(hooks);

  // Replace this with your real tests.
  test('it exists', function (assert) {
    const service = this.owner.lookup('service:reload-handler');
    assert.ok(service);
  });
});
