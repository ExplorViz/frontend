import { module, test } from 'qunit';
import { visit, currentURL } from '@ember/test-helpers';
import { setupApplicationTest } from 'ember-qunit';

module('Acceptance | index', (hooks) => {
  setupApplicationTest(hooks);

  test('visiting /index', async (assert) => {
    await visit('/index');
    assert.equal(currentURL(), '/login', 'Index route replaces current URL with login route.');
  });
});
