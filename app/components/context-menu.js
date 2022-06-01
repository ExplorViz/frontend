import RightClickMenu from 'ember-right-click-menu/components/right-click-menu';
import AlertifyHandler from 'explorviz-frontend/utils/alertify-handler';
import { action } from '@ember/object';

export default class ContextMenu extends RightClickMenu {

  @action
  addContextMenuListeners() {
    const targetElement = this.getTargetElement(this.popperId);
    targetElement.addEventListener('openmenu', this.openMenu);
    window.addEventListener('closemenu', this.closeContextMenu);
    window.addEventListener('click', this.closeContextMenu);
  }

  @action
  openMenu(event) {
    const srcEvent = event.detail.srcEvent
    this.contextMenu(srcEvent);
  }

  @action
  willDestroy() {
    window.removeEventListener('closemenu', this.closeContextMenu);
    window.removeEventListener('click', this.closeContextMenu);

    if (this.targetElement) {
      this.targetElement.removeEventListener('openmenu', this.openMenu);
    }

    super.willDestroy(...arguments);
  }

  @action
  closeContextMenu(e) {
    // path property expected by addon's implementation
    if (e && !e.path) {
      e.path = e.composedPath && e.composedPath();
    }
    super.closeContextMenu(e);
  }
}
