import { action } from '@ember/object';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

interface Args {
  componentId: string;
}

export default class SidebarComponent extends Component<Args> {
  @tracked
  componentName = this.args.componentId.replace(/-/g, ' ');

  @action
  onWheel(event: WheelEvent) {
    // Pass scroll event to <EmberScroll/> element
    $('.tse-scroll-content').trigger('wheel', event);
  }
}
