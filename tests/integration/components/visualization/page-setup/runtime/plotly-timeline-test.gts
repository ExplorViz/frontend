import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';
import TimelineDataObjectHandler from 'explorviz-frontend/utils/timeline/timeline-data-object-handler';

module(
  'Integration | Component | visualization/page-setup/bottom-bar/runtime/plotly-timeline',
  function (hooks) {
    setupRenderingTest(hooks);

    test('it renders', async function (assert) {
      // Set any properties with this.set('myProperty', 'value');
      // Handle any actions with this.set('myAction', function(val) { ... });

      const payload = new TimelineDataObjectHandler();

      this.set('timelineDataObject', payload.timelineDataObject);

      await render(hbs`<Visualization::PageSetup::BottomBar::Runtime::PlotlyTimeline @timelineDataObject={{this.timelineDataObject}} />`);

      const el: any = this.element;

      if (el) {
        assert.ok(el.textContent.trim().includes('No timestamps available!'));
      } else {
        assert.notOk('empty element', 'There was no element to test.');
      }
    });
  }
);
