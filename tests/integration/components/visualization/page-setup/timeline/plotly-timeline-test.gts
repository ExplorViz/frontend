import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';

module(
  'Integration | Component | visualization/page-setup/timeline/plotly-timeline',
  function (hooks) {
    setupRenderingTest(hooks);

    test('it renders', async function (assert) {
      // Set any properties with this.set('myProperty', 'value');
      // Handle any actions with this.set('myAction', function(val) { ... });

      this.set('timelineDataObject', {timestamps: []});

      await render(hbs`<Visualization::PageSetup::Timeline::PlotlyTimeline @timelineDataObject={{this.timelineDataObject}} />`);

      const el: any = this.element;

      if (el) {
        assert.ok(el.textContent.trim().includes('No timestamps available!'));
      } else {
        assert.notOk('empty element', 'There was no element to test.');
      }
    });
  }
);
