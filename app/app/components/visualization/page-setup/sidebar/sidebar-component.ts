import { action } from '@ember/object';
import Component from '@glimmer/component';

interface Args {
  componentId: string;
}

export default class SidebarComponent extends Component<Args> {
  @action
  onWheel(event: WheelEvent) {
    // Pass scroll event to <EmberScroll/> element
    $('.tse-scroll-content').trigger('wheel', event);
  }

  replaceDashesWithSpaces(name: string) {
    return name.replace(/-/g, ' ');
  }
}
