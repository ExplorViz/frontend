import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

module('Unit | Service | repos/evolution-data-repository.ts', function (hooks) {
  setupTest(hooks);

  // TODO: Replace this with your real tests.
  test('it exists', function (assert) {
    let service = this.owner.lookup('service:repos/evolution-data-repository.ts');
    assert.ok(service);
  });
});
