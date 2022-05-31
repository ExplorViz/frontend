import RightClickMenu from 'ember-right-click-menu/components/right-click-menu';
import { action } from '@ember/object';

export default class ContextMenu extends RightClickMenu {

  timer;

  moved;

  pointers = 0;

  @action
  addContextMenuListeners() {
    const targetElement = this.getTargetElement(this.popperId);
    targetElement.addEventListener('pointerdown', this.onPointerDown);
    targetElement.addEventListener('pointermove', this.onPointerMove);
    targetElement.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('click', this.closeContextMenu);
    window.addEventListener('contextmenu', this.closeContextMenu);
  }

  clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer)
    }
  }

  @action
  onPointerDown(event) {
    this.clearTimer();
    this.pointers++;
    this.moved = false;
    if (event.pointerType === 'touch' && this.pointers === 1) {
      this.timer = setTimeout(() => this.contextMenu(event), 600)
    }
  }

  @action
  onPointerMove(event) {
    this.moved = true;
    this.clearTimer();
  }

  @action
  onPointerUp(event) {
    this.clearTimer();
    if (event.button === 2 && !this.moved) {
      this.contextMenu(event);
    }
    this.pointers--;
  }

  @action
  willDestroy() {
    this.targetElement.removeEventListener('pointerdown', this.onPointerDown);
    this.targetElement.removeEventListener('pointermove', this.onPointerMove);
    this.targetElement.removeEventListener('pointerup', this.onPointerUp);

    window.removeEventListener('click', this.closeContextMenu);
    window.removeEventListener('contextmenu', this.closeContextMenu);

    if (this.targetElement) {
      this.targetElement.removeEventListener('pointerup', this.onPointerUp);
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
