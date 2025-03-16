import Component from '@glimmer/component';
import { action } from '@ember/object';
import { TinySnapshot } from 'react-lib/src/stores/snapshot-token';
import { useToastHandlerStore } from 'react-lib/src/stores/toast-handler';
import { useAuthStore } from 'react-lib/src/stores/auth';

export default class AdditionalSnapshotInfoComponent extends Component<TinySnapshot> {
  focusedClicks = 0;

  user = useAuthStore.getState().user;

  @action
  // eslint-disable-next-line class-methods-use-this
  onTokenIdCopied() {
    useToastHandlerStore
      .getState()
      .showSuccessToastMessage('Token id copied to clipboard');
  }

  @action
  hidePopover(event: Event) {
    if (this.isMouseOnPopover()) {
      return;
    }

    // Clicks enable us to differentiate between opened and closed popovers
    if (this.focusedClicks % 2 === 1) {
      event.target?.dispatchEvent(new Event('click'));
    }
    this.focusedClicks = 0;
  }

  isMouseOnPopover() {
    const hoveredElements = document.querySelectorAll(':hover');

    for (const element of hoveredElements) {
      if (element.matches('.popover')) {
        return true;
      }
    }
    return false;
  }

  @action
  onClick(event: Event) {
    this.focusedClicks += 1;
    // Prevent click on table row which would trigger to open the visualization
    event.stopPropagation();
  }
}
