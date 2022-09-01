import Component from '@glimmer/component';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import ArSettings from 'virtual-reality/services/ar-settings';

interface SidebarResizerArgs {}

export default class SidebarResizer extends Component<SidebarResizerArgs> {
  @service('ar-settings')
  private settings!: ArSettings;

  @action
  setup() {
    const dragButton = document.getElementById('sidebarDragButton');
    const buttonContainer = document.getElementById('sidebarButtonContainer');

    if (dragButton) {
      this.dragElement(dragButton);
      if (buttonContainer) {
        buttonContainer.appendChild(dragButton);
      }
    }
  }

  dragElement(resizeButton: HTMLElement) {
    const self = this;

    function setSidebarWidth(widthInPercent: number) {
      const sidebar = document.getElementById('dataselection');

      if (sidebar && widthInPercent > 20) {
        sidebar.style.maxWidth = `${widthInPercent}%`;
        self.settings.sidebarWidthInPercent = widthInPercent;
      }
    }

    function handleDragInput(targetX: number) {
      const buttonOffset = 30;
      const widthInPercent = 100 - ((targetX - buttonOffset) / (window.innerWidth)) * 100;

      setSidebarWidth(widthInPercent);
    }

    function cancelDragElement() {
      // stop moving when mouse button is released:
      document.onmouseup = null;
      document.onmousemove = null;
      document.ontouchcancel = null;
      document.ontouchend = null;
      document.ontouchmove = null;
    }

    function elementMouseDrag(e: MouseEvent) {
      const event = e || window.event;
      event.preventDefault();

      handleDragInput(e.clientX);
    }

    function elementTouchDrag(e: TouchEvent) {
      const event = e || window.event;
      event.preventDefault();

      if (event.targetTouches.length < 1) {
        cancelDragElement();
      } else {
        const { clientX } = event.targetTouches[0];

        handleDragInput(clientX);
      }
    }

    function dragMouseDown(e: MouseEvent) {
      const event = e || window.event;
      event.preventDefault();

      document.onmouseup = cancelDragElement;
      // Call a function whenever the cursor moves:
      document.onmousemove = elementMouseDrag;
    }

    function dragTouchDown(e: TouchEvent) {
      const event = e || window.event;
      event.preventDefault();

      if (event.targetTouches.length > 0) {
        document.ontouchcancel = cancelDragElement;
        document.ontouchend = cancelDragElement;

        document.ontouchmove = elementTouchDrag;
      }
    }

    resizeButton.onmousedown = dragMouseDown;
    resizeButton.ontouchstart = dragTouchDown;

    if (this.settings.sidebarWidthInPercent) {
      setSidebarWidth(this.settings.sidebarWidthInPercent);
    }
  }
}
