import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { click, render } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';

module('Integration | Component | additional-token-info', function (hooks) {
  setupRenderingTest(hooks);

  test('renders popover', async function (assert) {
    this.set('token', {
      alias: 'landscape1',
      created: 1620160927914,
      ownerId: 'github|1234',
      value: '0123',
      sharedUsersIds: [],
    });

    await render(hbs`<AdditionalTokenInfo @token={{this.token}} />`);

    await click('.button-svg-with-hover');

    assert.equal(
      this.element
        .querySelector('tbody > tr td:nth-child(2)')
        ?.textContent?.trim(),
      'github|1234'
    );

    assert.equal(
      this.element
        .querySelector('tbody > tr:nth-child(2) td:nth-child(2)')
        ?.textContent?.trim(),
      '0123'
    );
  });
});
