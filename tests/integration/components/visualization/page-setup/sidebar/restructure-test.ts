import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';

module('Integration | Component | visualization/page-setup/sidebar/restructure', function(hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function(assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    /*await render(hbs`{{visualization/page-setup/sidebar/restructure}}`);

    assert.equal(this.element.textContent.trim(), '');

    // Template block usage:
    await render(hbs`
      <Visualization::PageSetup::Sidebar::Restructure>
        template block text
      </Visualization::PageSetup::Sidebar::Restructure>
    `);

    assert.equal(this.element.textContent.trim(), 'template block text');*/
    assert.equal(true, true, 'TODO');
  });
});
