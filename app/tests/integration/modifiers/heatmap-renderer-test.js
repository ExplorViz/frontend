import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Modifier | heatmap-renderer', (hooks) => {
  setupRenderingTest(hooks);

  // Replace this with your real tests.
  test('it renders', async (assert) => {
    await render(hbs`<div {{heatmap-renderer}}></div>`);

    assert.expect(0);
  });
});
