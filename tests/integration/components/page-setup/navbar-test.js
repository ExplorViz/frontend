/* eslint-disable qunit/no-commented-tests */
// import { module, test } from 'qunit';
import { module } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
// import { render } from '@ember/test-helpers';
// import hbs from 'htmlbars-inline-precompile';
// import Service from '@ember/service';

module('Integration | Component | page-setup/navbar', (hooks) => {
  setupRenderingTest(hooks);

  // TODO Seems to fail due to route-action-helper
  // https://github.com/DockYard/ember-route-action-helper/issues/42

  /* test('visualization template contains main routes', async function(assert) {
    await render(hbs`{{page-setup/navbar}}`);

    assert.ok(this.element.textContent.trim().includes('Visualization'));
  });

  // eslint-disable-next-line qunit/no-commented-tests
  test('username is rendered', async function(assert) {
    await render(hbs`{{page-setup/navbar}}`);

    assert.equal(this.element.textContent.trim(), "test");
  }); */
});
