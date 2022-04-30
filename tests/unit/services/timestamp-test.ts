import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

module('Unit | Service | timestamp', function(hooks) {
  setupTest(hooks);

  // Replace this with your real tests.
  test('it exists', function(assert) {
    let service = this.owner.lookup('service:timestamp');
    assert.ok(service);
  });
});

