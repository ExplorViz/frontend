import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';

module('Integration | Component | page-setup/footer', function(hooks) {
  setupRenderingTest(hooks);

  test('contains footer information', async function(assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    await render(hbs`{{page-setup/footer}}`);

    assert.ok(this.element.textContent.trim().includes('Kiel University'));
    assert.ok(this.element.textContent.trim().includes('Legal Notice'));
    assert.ok(this.element.textContent.trim().includes('Contact'));
    
  });
});