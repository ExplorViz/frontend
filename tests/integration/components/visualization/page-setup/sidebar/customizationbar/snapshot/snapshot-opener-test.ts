import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | visualization/page-setup/sidebar/customizationbar/snapshot/snapshot-opener', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    // await render(hbs`<Visualization::PageSetup::Sidebar::Customizationbar::Snapshot::SnapshotOpener />`);

    // assert.dom().hasText('');

    // // Template block usage:
    // await render(hbs`
    //   <Visualization::PageSetup::Sidebar::Customizationbar::Snapshot::SnapshotOpener>
    //     template block text
    //   </Visualization::PageSetup::Sidebar::Customizationbar::Snapshot::SnapshotOpener>
    // `);

    // assert.dom().hasText('template block text');
    assert.equal(true, true, 'TODO');
  });
});
