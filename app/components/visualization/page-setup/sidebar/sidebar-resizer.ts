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

    // Init drag functionality
    if (dragButton) {
      this.dragElement(dragButton);
      if (buttonContainer) {
        buttonContainer.appendChild(dragButton);
      }
    }

    // Init sidebar width
    const sidebarWidthInPercent = Number(
      localStorage.getItem(this.args.sidebarName + 'WithInPercent')
    );

    if (typeof sidebarWidthInPercent == 'number') {
      this.setSidebarWidth(sidebarWidthInPercent);
    }
  }

  setSidebarWidth(widthInPercent: number) {
    const sidebar = document.getElementById(this.args.sidebarName);

    if (sidebar && widthInPercent > 20) {
      sidebar.style.maxWidth = `${widthInPercent}%`;
      localStorage.setItem(
        this.args.sidebarName + 'WithInPercent',
        widthInPercent.toString()
      );
    }
  }

  dragElement(resizeButton: HTMLElement) {
    const setSidebarWidth = this.setSidebarWidth.bind(this);
    const expandToRight = this.args.expandToRight;

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

    const cancelDragElement = () => {
      // stop moving when mouse button is released:
      document.onmouseup = null;
      document.onmousemove = null;
      document.ontouchcancel = null;
      document.ontouchend = null;
      document.ontouchmove = null;
    };

    const elementMouseDrag = (e: MouseEvent) => {
      e.preventDefault();

      handleDragInput(e.clientX);
    };

    const elementTouchDrag = (e: TouchEvent) => {
      e.preventDefault();

      if (e.targetTouches.length < 1) {
        cancelDragElement();
      } else {
        const { clientX } = e.targetTouches[0];

        handleDragInput(clientX);
      }
    };

    const dragMouseDown = (e: MouseEvent) => {
      e.preventDefault();

      document.onmouseup = cancelDragElement;
      // Call a function whenever the cursor moves:
      document.onmousemove = elementMouseDrag;
    };

    const dragTouchDown = (e: TouchEvent) => {
      e.preventDefault();

      if (e.targetTouches.length > 0) {
        document.ontouchcancel = cancelDragElement;
        document.ontouchend = cancelDragElement;

        document.ontouchmove = elementTouchDrag;
      }
    };

    resizeButton.onmousedown = dragMouseDown;
    resizeButton.ontouchstart = dragTouchDown;
  }
}
