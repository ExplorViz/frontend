import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Helper | isValidPopupSection', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    await render(hbs`{{is-valid-popup-section "dynamic" "dynamic"}}`);
    assert.dom().hasText('true');
    await render(hbs`{{is-valid-popup-section "static" "dynamic"}}`);
    assert.dom().hasText('false');
    await render(hbs`{{is-valid-popup-section "static" "static+dynamic"}}`);
    assert.dom().hasText('true');
    await render(hbs`{{is-valid-popup-section "dynamic" "static+dynamic"}}`);
    assert.dom().hasText('true');
    await render(hbs`{{is-valid-popup-section "dynamic" "static"}}`);
    assert.dom().hasText('false');
    await render(hbs`{{is-valid-popup-section "static" "static"}}`);
    assert.dom().hasText('true');
  });
});
