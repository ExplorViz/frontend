import { module, test } from 'qunit';
import { setupRenderingTest } from 'explorviz-frontend/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | example', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    await render(hbs`<Example />`);

    assert.dom().hasText('');

    // Template block usage:
    await render(hbs`
      <Example>
        template block text
      </Example>
    `);

    assert.dom().hasText('template block text');
  });
});
