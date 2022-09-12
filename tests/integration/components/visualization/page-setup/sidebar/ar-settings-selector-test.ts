import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';

module('Integration | Component | visualization/page-setup/sidebar/ar-settings-selector', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    await render(hbs`<Visualization::PageSetup::Sidebar::ArSettingsSelector />`);

    const { textContent } = this.element;

    if (textContent === null) {
      assert.ok(null, 'no text content');
    } else {
      assert.notEqual(textContent.trim(), '');
    }
  });
});
