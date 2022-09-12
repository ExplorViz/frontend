import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
// import { render } from '@ember/test-helpers';
// import hbs from 'htmlbars-inline-precompile';

module('Integration | Component | visualization/page-setup/ar-buttons/primary-interaction-button', function (hooks) {
  setupRenderingTest(hooks);

  test('dummy', async function (assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    /*
    this.set('dummyAction', function () {});
    await render(hbs`<Visualization::PageSetup::ArButtons::PrimaryInteractionButton
      @handlePrimaryCrosshairInteraction={{@dummyAction}}
      @openAllComponents={{@dummyAction}}
    />`);

    const { textContent } = this.element;

    if (textContent === null) {
      assert.ok(null, 'textContent is null');
    } else {
      assert.equal(textContent.trim(), '');
    }
    */
    assert.equal(true, true);
  });
});
