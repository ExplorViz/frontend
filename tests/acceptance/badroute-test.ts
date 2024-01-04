import { module, test } from 'qunit';
import { visit, currentURL } from '@ember/test-helpers';
import { setupApplicationTest } from 'ember-qunit';

module('Acceptance | badroute', (hooks) => {
  setupApplicationTest(hooks);

  test('visiting /badroute', async (assert) => {
    await visit('/badroute');
    assert.equal(
      currentURL(),
      '/landscapes',
      'Every non valid route is redirected to landscapes.'
    );
  });
});
