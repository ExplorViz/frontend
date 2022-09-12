import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';

module('Integration | Component | visualization/rendering/loading-indicator', function (hooks) {
  setupRenderingTest(hooks);

  test('shows given loading text', async function (assert) {
    await render(hbs`<Visualization::Rendering::LoadingIndicator @text="Loading landscape"/>`);

    assert.ok(this.element.textContent !== null && this.element.textContent.trim() === 'Loading landscape');
  });
});
