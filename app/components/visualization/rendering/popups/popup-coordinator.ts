import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import Component from '@glimmer/component';
import CollaborationSession from 'collaborative-mode/services/collaboration-session';
import { Position2D } from 'explorviz-frontend/modifiers/interaction-modifier';
import PopupHandler from 'explorviz-frontend/rendering/application/popup-handler';
import Configuration from 'explorviz-frontend/services/configuration';
import HighlightingService from 'explorviz-frontend/services/highlighting-service';
import {
  isApplication,
  isClass,
  isNode,
  isPackage,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import ClazzCommuMeshDataModel from 'explorviz-frontend/view-objects/3d/application/utils/clazz-communication-mesh-data-model';
import PopupData from './popup-data';
import LocalUser from 'collaborative-mode/services/local-user';

interface IArgs {
  isMovable: boolean;
  popupData: PopupData;
  popupHandler: PopupHandler;
  removePopup(entityId: string): void;
  pinPopup(popup: PopupData): void;
  sharePopup(popup: PopupData): void;
  updateMeshReference(popup: PopupData): void;
}

export default class PopupCoordinator extends Component<IArgs> {
  @service('configuration')
  configuration!: Configuration;

  @service('highlighting-service')
  highlightingService!: HighlightingService;

  @service('collaboration-session')
  private collaborationSession!: CollaborationSession;

  @service('local-user')
  localUser!: LocalUser;

  element!: HTMLDivElement;

  lastMousePosition: Position2D = {
    x: 0,
    y: 0,
  };

  @action
  onPointerOver() {
    this.args.popupData.mesh.applyHoverEffect();
    this.args.popupData.hovered = true;
  }

  @action
  onPointerOut() {
    this.args.popupData.mesh.resetHoverEffect();
    this.args.popupData.hovered = false;
  }

  get sharedByColor() {
    const userId = this.args.popupData.sharedBy;
    if (!userId) {
      return '';
    }
    return this.collaborationSession.getColor(userId);
  }

  @action
  closeIfNotPinned() {
    if (!this.args.popupData.isPinned) {
      this.args.removePopup(this.args.popupData.entity.id);
    }
  }

  @action
  highlight() {
    this.args.updateMeshReference(this.args.popupData);
    this.highlightingService.highlight(this.args.popupData.mesh, true);
    this.highlightingService.updateHighlighting();
  }

  // Not used at the moment since mesh reference is not kept updated for collab
  get highlightingColorStyle() {
    if (this.args.popupData.mesh.highlighted) {
      const hexColor =
        this.args.popupData.mesh.highlightingColor.getHexString();
      return `#${hexColor}`;
    }
    return '';
  }

  @action
  dragMouseDown(event: MouseEvent) {
    if (!this.args.isMovable) {
      return;
    }

    event.preventDefault();
    // get the mouse cursor position at startup:
    this.lastMousePosition.x = event.clientX;
    this.lastMousePosition.y = event.clientY;
    document.onpointerup = this.closeDragElement;
    // call a function whenever the cursor moves:
    document.onpointermove = this.elementDrag;
  }

  @action
  elementDrag(event: MouseEvent) {
    this.args.popupData.wasMoved = true;

    event.preventDefault();
    // Calculate delta of cursor position:
    const diffX = this.lastMousePosition.x - event.clientX;
    const diffY = this.lastMousePosition.y - event.clientY;

    // Store latest mouse position for next delta calulation
    this.lastMousePosition.x = event.clientX;
    this.lastMousePosition.y = event.clientY;

    // Set the element's new position:
    const containerDiv = this.element.parentElement as HTMLElement;

    const popoverHeight = this.element.clientHeight;
    const popoverWidth = this.element.clientWidth;

    let newPositionX = this.element.offsetLeft - diffX;
    let newPositionY = this.element.offsetTop - diffY;

    // Prevent popup position outside of rendering canvas in x-direction
    if (newPositionX < 0) {
      newPositionX = 0;
    } else if (
      containerDiv.clientWidth &&
      newPositionX > containerDiv.clientWidth - popoverWidth
    ) {
      newPositionX = containerDiv.clientWidth - popoverWidth;
    }

    // Prevent popup position outside of rendering canvas in y-direction
    if (newPositionY < 0) {
      newPositionY = 0;
    } else if (
      containerDiv.clientHeight &&
      newPositionY > containerDiv.clientHeight - popoverHeight
    ) {
      newPositionY = containerDiv.clientHeight - popoverHeight;
    }

    // Update stored popup position relative to new position
    this.args.popupData.mouseX -= this.element.offsetLeft - newPositionX;
    this.args.popupData.mouseY -= this.element.offsetTop - newPositionY;

    this.element.style.top = `${newPositionY}px`;
    this.element.style.left = `${newPositionX}px`;
  }

  // eslint-disable-next-line class-methods-use-this
  closeDragElement() {
    /* stop moving when mouse button is released: */
    document.onpointerup = null;
    document.onpointermove = null;
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

    if (
      popoverHeight === undefined ||
      popoverWidth === undefined ||
      containerWidth === undefined
    ) {
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
