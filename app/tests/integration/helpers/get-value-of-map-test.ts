import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';

module('Integration | Helper | getValueOfMap', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    const map = new Map<string, string>();
    map.set('hello', 'world');
    this.set('map', map);

    await render(hbs`{{get-value-of-map this.map "hello"}}`);

    assert.equal(this.element.textContent!.trim(), 'world');
  });
});
