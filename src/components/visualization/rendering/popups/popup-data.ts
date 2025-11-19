import ClassCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/class-communication';
import {
  Application,
  Class,
  Package,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { K8sDataModel } from 'explorviz-frontend/src/view-objects/3d/k8s/k8s-mesh';

export interface PopupDataArgs {
  mouseX: number;
  mouseY: number;
  wasMoved: boolean;
  entityId: string;
  entity:
    | K8sDataModel
    | Node
    | Application
    | Package
    | Class
    | ClassCommunication;
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

  entity:
    | K8sDataModel
    | Node
    | Application
    | Package
    | Class
    | ClassCommunication;

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
