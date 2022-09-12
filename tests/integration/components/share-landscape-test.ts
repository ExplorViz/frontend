import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { click, render } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';

module('Integration | Component | share-landscape', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    await render(hbs`<ShareLandscape />`);

    assert.equal(this.element.textContent?.trim(), '');

    assert.equal(this.element.querySelector('.table-striped'), undefined);

    await click('.button-svg-with-hover');

    assert.equal(this.element.querySelector('.table-striped > tbody')?.childElementCount, 1);
  });
});
