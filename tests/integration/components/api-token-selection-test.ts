import { module, test } from 'qunit';
import { setupRenderingTest } from 'explorviz-frontend/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | api-token-selection', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    await render(hbs`<ApiTokenSelection />`);

    assert.dom().hasText('');

    // Template block usage:
    await render(hbs`
      <ApiTokenSelection>
        template block text
      </ApiTokenSelection>
    `);

    assert.dom().hasText('template block text');
  });
});
