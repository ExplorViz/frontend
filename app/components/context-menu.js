import RightClickMenu from 'ember-right-click-menu/components/right-click-menu';
import { action } from '@ember/object';

export default class ContextMenu extends RightClickMenu {

  @action
  addContextMenuListeners() {
    const targetElement = this.getTargetElement(this.popperId);
    targetElement.addEventListener('openmenu', this.openMenu);
    window.addEventListener('click', this.closeContextMenu);
    window.addEventListener('contextmenu', this.closeContextMenu);
  }

  @action
  openMenu(event) {
    this.contextMenu(event.detail.srcEvent);
  }

  @action
  willDestroy() {
    window.removeEventListener('click', this.closeContextMenu);
    window.removeEventListener('contextmenu', this.closeContextMenu);

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
