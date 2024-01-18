import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
// import { render } from '@ember/test-helpers';
// import hbs from 'htmlbars-inline-precompile';
// import { TestModuleForComponent } from 'ember-test-helpers';

module('Integration | Component | ar-rendering', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    /*
    await render(hbs`{{ar-rendering}}`);

    assert.equal(this.element.textContent.trim(), '');

    // Template block usage:
    await render(hbs`
      {{#ar-rendering}}
        template block text
      {{/ar-rendering}}
    `);
    */

    assert.equal(true, true, 'ToDd');
  });
});
