import { module, test } from 'qunit';
import { setupTest } from 'explorviz-frontend/tests/helpers';

module('Unit | Service | commit-tree-state', function (hooks) {
  setupTest(hooks);

  // TODO: Replace this with your real tests.
  test('it exists', function (assert) {
    let service = this.owner.lookup('service:commit-tree-state');
    assert.ok(service);
  });
});
