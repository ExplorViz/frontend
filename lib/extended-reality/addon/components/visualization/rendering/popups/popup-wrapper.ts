import Component from '@glimmer/component';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import {
  Application,
  Class,
  Package,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import ArSettings from 'extended-reality/services/ar-settings';

interface PopupWrapperArgs {
  popupData: {
    id: number;
    isPinned: boolean;
    posX: number;
    posY: number;
    entity: Node | Application | Package | Class;
  };
  keepPopupOpen(id: number): void;
  setPopupPosition(id: number, posX: number, posY: number): void;
  closePopup(id: number): void;
}

export default class PopupWrapper extends Component<PopupWrapperArgs> {
  @service('ar-settings')
  arSettings!: ArSettings;

  isPinned = false;

  divElement!: HTMLElement;

  panDeltaX = 0;

  panDeltaY = 0;

  @action
  setupDragElement(element: HTMLElement) {
    this.initializePanListener(element);

    this.setupInitialPosition(element);

    this.divElement = element;

    if (this.arSettings.stackPopups) {
      this.args.keepPopupOpen(this.args.popupData.id);
    }
  }

  initializePanListener(element: HTMLElement) {
    const mc = new Hammer(element);

    mc.get('pan').set({ direction: Hammer.DIRECTION_ALL });

    // Keep track of pan distance since pan start
    mc.on('panstart', () => {
      this.keepPopupOpen();
      this.panDeltaX = 0;
      this.panDeltaY = 0;
    });

    mc.on('panleft panright panup pandown', (ev) => {
      // Calculate positional difference since last pan event
      const currentDeltaX = this.panDeltaX - ev.deltaX;
      const currentDeltaY = this.panDeltaY - ev.deltaY;

      this.handlePan(currentDeltaX, currentDeltaY);

      this.panDeltaX = ev.deltaX;
      this.panDeltaY = ev.deltaY;
    });
  }

  @action
  keepPopupOpen() {
    if (!this.args.popupData.isPinned) {
      this.args.keepPopupOpen(this.args.popupData.id);
    }
  }

  @action
  closePopup() {
    this.args.closePopup(this.args.popupData.id);
  }

  setupInitialPosition(popoverDiv: HTMLElement) {
    const { popupData } = this.args;

    // Set to previously stored position
    if (popupData.isPinned) {
      popoverDiv.style.left = `${popupData.posX}px`;
      popoverDiv.style.top = `${popupData.posY}px`;
      return;
    }

    // Sorrounding div for position calculations
    const containerDiv = popoverDiv.parentElement as HTMLElement;

    const popoverHeight = popoverDiv.clientHeight;
    const popoverWidth = popoverDiv.clientWidth;

    const containerWidth = containerDiv.clientWidth;

    if (
      popoverHeight === undefined ||
      popoverWidth === undefined ||
      containerWidth === undefined
    ) {
      return;
    }

    const popupTopOffset = popoverHeight + 40;
    const popupLeftOffset = popoverWidth / 2;

    let popupTopPosition = containerDiv.clientHeight / 2 - popupTopOffset;
    let popupLeftPosition = containerDiv.clientWidth / 2 - popupLeftOffset;

    // Prevent popup positioning on top of rendering canvas =>
    // position under mouse cursor
    if (popupTopPosition < 0) {
      const approximateMouseHeight = 35;
      popupTopPosition = popupData.posY + approximateMouseHeight;
    }

    // Prevent popup positioning right(outside) of rendering canvas =>
    // position at right edge of canvas
    if (popupLeftPosition + popoverWidth > containerWidth) {
      const extraPopupMarginFromAtBottom = 5;
      popupLeftPosition =
        containerWidth - popoverWidth - extraPopupMarginFromAtBottom;
    }

    // Prevent popup positioning left(outside) of rendering canvas =>
    // position at left edge of canvas
    if (popupLeftPosition < 0) {
      popupLeftPosition = 0;
    }

    // Set popup position
    /* eslint-disable no-param-reassign */
    popoverDiv.style.top = `${popupTopPosition}px`;
    popoverDiv.style.left = `${popupLeftPosition}px`;

    this.args.setPopupPosition(
      this.args.popupData.id,
      popupLeftPosition,
      popupTopPosition
    );
  }

  handlePan(deltaX: number, deltaY: number) {
    const self = this;

    function xPositionInsideWindow(minX: number, maxX: number) {
      return minX >= 0 && maxX <= window.innerWidth;
    }

    function yPositionInsideWindow(minY: number, maxY: number) {
      return minY >= 0 && maxY <= window.innerHeight;
    }

    function moveElement(xOffset: number, yOffset: number) {
      // Calculation of old and new coordinates
      const oldMinX = self.divElement.offsetLeft;
      const oldMaxX = oldMinX + self.divElement.clientWidth;
      const oldMinY = self.divElement.offsetTop;
      const oldMaxY = oldMinY + self.divElement.clientHeight;

      const newMinX = oldMinX - xOffset;
      const newMaxX = newMinX + self.divElement.clientWidth;
      const newMinY = oldMinY - yOffset;
      const newMaxY = newMinY + self.divElement.clientHeight;

      // Set the element's new position:
      if (
        !xPositionInsideWindow(oldMinX, oldMaxX) ||
        xPositionInsideWindow(newMinX, newMaxX)
      ) {
        self.divElement.style.left = `${newMinX}px`;
      }

      if (
        !yPositionInsideWindow(oldMinY, oldMaxY) ||
        yPositionInsideWindow(newMinY, newMaxY)
      ) {
        self.divElement.style.top = `${newMinY}px`;
      }

      self.args.setPopupPosition(self.args.popupData.id, newMinX, newMinY);
    }

    moveElement(deltaX, deltaY);
  }
}
