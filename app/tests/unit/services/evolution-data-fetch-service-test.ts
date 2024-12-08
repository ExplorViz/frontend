import { module, test } from 'qunit';
import { setupTest } from 'explorviz-frontend/tests/helpers';

module('Unit | Service | evolution-data-fetch-service', function (hooks) {
  setupTest(hooks);

  // TODO: Replace this with your real tests.
  test('it exists', function (assert) {
    let service = this.owner.lookup('service:evolution-data-fetch-service');
    assert.ok(service);
  });
});
