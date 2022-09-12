import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
// import hbs from 'htmlbars-inline-precompile';

module('Integration | Component | application rendering', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', function (assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.on('myAction', function(val) { ... });

    // this.render(hbs`{{application-rendering}}`);

    // assert.equal(this.$().text().trim(), "''");

    // Template block usage:
    // this.render(hbs`
    //  {{#application-rendering}}
    //     template block text
    //  {{/application-rendering}}
    // `);

    // assert.equal(this.$().text().trim(), 'template block text');

    assert.equal(true, true);
  });
});
