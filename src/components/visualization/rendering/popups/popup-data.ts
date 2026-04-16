import ClassCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/class-communication';
import {
  Building,
  City,
  District,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';

export interface PopupDataArgs {
  mouseX: number;
  mouseY: number;
  wasMoved: boolean;
  entityId: string;
  entity: City | District | Building | ClassCommunication;
  isPinned: boolean;
  sharedBy: string;
  menuId: string | null;
  hovered: boolean;
}

export default class PopupData {
  // @tracked
  mouseX: number;

  // @tracked
  mouseY: number;

  // @tracked
  wasMoved: boolean;

  entityId: string;

  entity: City | District | Building | ClassCommunication;

  // @tracked
  isPinned: boolean;

  // @tracked
  sharedBy: string | null;

  menuId: string | null;

  // @tracked
  hovered: boolean;

  constructor({
    mouseX,
    mouseY,
    entityId,
    entity,
    wasMoved,
    isPinned,
    sharedBy,
    menuId,
    hovered,
  }: PopupDataArgs) {
    this.mouseX = mouseX;
    this.mouseY = mouseY;
    this.entityId = entityId;
    this.entity = entity;
    this.wasMoved = wasMoved;
    this.isPinned = isPinned;
    this.sharedBy = sharedBy;
    this.menuId = menuId;
    this.hovered = hovered;
  }
}
