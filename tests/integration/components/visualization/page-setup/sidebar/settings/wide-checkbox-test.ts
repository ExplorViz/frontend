import { setupRenderingTest } from 'ember-qunit';
import { module, test } from 'qunit';
// import { render } from '@ember/test-helpers';
// import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | visualization/page-setup/sidebar/settings/wide-checkbox', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    // await render(hbs`<Visualization::PageSetup::Sidebar::Settings::WideCheckbox
    //                     @value={{true}}
    //                     @onChange={{boolFun}}
    //                 />`);

    // assert.dom(this.element).hasText('');


    // Template block usage:
    // await render(hbs`
    //     <Visualization::PageSetup::Sidebar::Settings::WideCheckbox
    //       @value={{true}}
    //       @onChange={{boolFun}}
    //     >
    //     'template block text'
    //     </Visualization::PageSetup::Sidebar::Settings::WideCheckbox>
    // `);

    // assert.dom(this.element).hasText('template block text');

    assert.equal(true, true, 'TODO');
  });
});
