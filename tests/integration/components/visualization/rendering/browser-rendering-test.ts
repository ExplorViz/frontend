import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';

module('Integration | Component | visualization/rendering/browser-rendering', function(hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function(assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    await render(hbs`{{visualization/rendering/browser-rendering}}`);

    assert.equal(this.element.textContent.trim(), '');

    // Template block usage:
    await render(hbs`
      {{#visualization/rendering/browser-rendering}}
        template block text
      {{/visualization/rendering/browser-rendering}}
    `);

    assert.equal(this.element.textContent.trim(), 'template block text');
  });
});
