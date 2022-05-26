import { action } from '@ember/object';
import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { Position2D } from 'explorviz-frontend/modifiers/interaction-modifier';
import {
  Application, Class, isApplication, isClass, isNode, isPackage, Node, Package,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import Configuration from 'explorviz-frontend/services/configuration';
import ClazzCommuMeshDataModel from 'explorviz-frontend/view-objects/3d/application/utils/clazz-communication-mesh-data-model';

interface IArgs {
  isMovable: boolean;
  popupData: {
    mouseX: number,
    mouseY: number,
    entity: Node | Application | Package | Class | ClazzCommuMeshDataModel,
    applicationId: string;
    isPinned: boolean,
  };
  removePopup(entityId: string): void;
  pinPopup(entityId: string): void;
}

export default class PopupCoordinator extends Component<IArgs> {
  @service('configuration')
  configuration!: Configuration;

  element!: HTMLDivElement;

  lastMousePosition: Position2D = {
    x: 0,
    y: 0,
  };

  @action
  dragMouseDown(event: MouseEvent) {
    if (!this.args.isMovable) {
      return;
    }

    event.preventDefault();
    // get the mouse cursor position at startup:
    this.lastMousePosition.x = event.clientX;
    this.lastMousePosition.y = event.clientY;
    document.onmouseup = this.closeDragElement;
    // call a function whenever the cursor moves:
    document.onmousemove = this.elementDrag;
  }

  @action
  elementDrag(event: MouseEvent) {
    event.preventDefault();
    // calculate the new cursor position:
    const diffX = this.lastMousePosition.x - event.clientX;
    const diffY = this.lastMousePosition.y - event.clientY;
    this.lastMousePosition.x = event.clientX;
    this.lastMousePosition.y = event.clientY;
    // set the element's new position:
    const containerDiv = this.element.parentElement as HTMLElement;

    const popoverHeight = this.element.clientHeight;
    const popoverWidth = this.element.clientWidth;

    let newPositionX = this.element.offsetLeft - diffX;
    let newPositionY = this.element.offsetTop - diffY;

    if (newPositionX < 0) {
      newPositionX = 0;
    } else if (containerDiv.clientWidth
      && newPositionX > containerDiv.clientWidth - popoverWidth) {
      newPositionX = containerDiv.clientWidth - popoverWidth;
    }

    if (newPositionY < 0) {
      newPositionY = 0;
    } else if (containerDiv.clientHeight
      && newPositionY > containerDiv.clientHeight - popoverHeight) {
      newPositionY = containerDiv.clientHeight - popoverHeight;
    }

    if (!this.args.popupData.isPinned) {
      this.configuration.popupPosition = {
        x: newPositionX,
        y: newPositionY,
      };
    }

    this.element.style.top = `${newPositionY}px`;
    this.element.style.left = `${newPositionX}px`;
  }

  // eslint-disable-next-line class-methods-use-this
  closeDragElement() {
    /* stop moving when mouse button is released: */
    document.onmouseup = null;
    document.onmousemove = null;
  }

  @action
  setPopupPosition(popoverDiv: HTMLDivElement) {
    this.element = popoverDiv;
    const { popupData } = this.args;

    if (!popupData) {
      return;
    }

    // Sorrounding div for position calculations
    const containerDiv = popoverDiv.parentElement as HTMLElement;

    const popoverHeight = popoverDiv.clientHeight;
    const popoverWidth = popoverDiv.clientWidth;

    const containerWidth = containerDiv.clientWidth;

    if (popoverHeight === undefined || popoverWidth === undefined || containerWidth === undefined) {
      return;
    }

    const popupTopOffset = popoverHeight + 10;
    const popupLeftOffset = popoverWidth / 2;

    let popupTopPosition = popupData.mouseY - popupTopOffset;
    let popupLeftPosition = popupData.mouseX - popupLeftOffset;

    // Prevent popup positioning on top of rendering canvas =>
    // position under mouse cursor
    if (popupTopPosition < 0) {
      const approximateMouseHeight = 35;
      popupTopPosition = popupData.mouseY + approximateMouseHeight;
    }

    // Prevent popup positioning right(outside) of rendering canvas =>
    // position at right edge of canvas
    if (popupLeftPosition + popoverWidth > containerWidth) {
      const extraPopupMarginFromAtBottom = 5;
      popupLeftPosition = containerWidth - popoverWidth - extraPopupMarginFromAtBottom;
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
  }

  get entityType() {
    if (!this.args.popupData) {
      return '';
    }
    if (isNode(this.args.popupData.entity)) {
      return 'node';
    }
    if (isApplication(this.args.popupData.entity)) {
      return 'application';
    }
    if (isClass(this.args.popupData.entity)) {
      return 'class';
    }
    if (isPackage(this.args.popupData.entity)) {
      return 'package';
    }
    if (this.args.popupData.entity instanceof ClazzCommuMeshDataModel) {
      return 'drawableClassCommunication';
    }

    return '';
  }
}
