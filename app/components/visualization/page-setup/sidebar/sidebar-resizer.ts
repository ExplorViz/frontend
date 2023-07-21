import Component from '@glimmer/component';
import { action } from '@ember/object';

interface SidebarArgs {
  readonly buttonName: string;
  readonly containerName: string;
  readonly sidebarName: string;
  readonly expandToRight: boolean;
}

export default class SidebarResizer extends Component<SidebarArgs> {
  sidebarName!: string;

  @action
  setup() {
    const dragButton = document.getElementById(this.args.buttonName);
    const buttonContainer = document.getElementById(this.args.containerName);

    if (dragButton) {
      this.dragElement(dragButton);
      if (buttonContainer) {
        buttonContainer.appendChild(dragButton);
      }
    }
  }

  dragElement(resizeButton: HTMLElement) {
    const sidebarName = this.args.sidebarName;
    const expandToRight = this.args.expandToRight;

    function setSidebarWidth(widthInPercent: number) {
      const sidebar = document.getElementById(sidebarName);

      if (sidebar && widthInPercent > 20) {
        sidebar.style.maxWidth = `${widthInPercent}%`;
      }
    }

    function handleDragInput(targetX: number) {
      let widthInPercent: number;

      if (expandToRight) {
        const buttonOffset = 30;
        widthInPercent = ((targetX + buttonOffset) / window.innerWidth) * 100;
      } else {
        const buttonOffset = 30;
        widthInPercent =
          100 - ((targetX - buttonOffset) / window.innerWidth) * 100;
      }

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
  }
}
