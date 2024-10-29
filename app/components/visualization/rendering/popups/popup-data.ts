import { tracked } from '@glimmer/tracking';
import { EntityMesh } from 'extended-reality/utils/vr-helpers/detail-info-composer';
import {
  Application,
  Class,
  Method,
  Node,
  Package,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import ClazzCommuMeshDataModel from 'explorviz-frontend/view-objects/3d/application/utils/clazz-communication-mesh-data-model';

export interface PopupDataArgs {
  mouseX: number;
  mouseY: number;
  wasMoved: boolean;
  entity: Node | Application | Package | Class | ClazzCommuMeshDataModel;
  mesh: EntityMesh;
  applicationId: string;
  isPinned: boolean;
  sharedBy: string;
  menuId: string | null;
  hovered: boolean;
}

export default class PopupData {
  @tracked
  mouseX: number;

  @tracked
  mouseY: number;

  @tracked
  wasMoved: boolean;

  entity:
    | Node
    | Application
    | Package
    | Class
    | ClazzCommuMeshDataModel
    | Method;

  mesh: EntityMesh;

  applicationId: string;

  @tracked
  isPinned: boolean;

  @tracked
  sharedBy: string | null;

  menuId: string | null;

  @tracked
  hovered: boolean;

  constructor({
    mouseX,
    mouseY,
    entity,
    mesh,
    applicationId,
    wasMoved,
    isPinned,
    sharedBy,
    menuId,
    hovered,
  }: PopupDataArgs) {
    this.mouseX = mouseX;
    this.mouseY = mouseY;
    this.entity = entity;
    this.wasMoved = wasMoved;
    this.mesh = mesh;
    this.applicationId = applicationId;
    this.isPinned = isPinned;
    this.sharedBy = sharedBy;
    this.menuId = menuId;
    this.hovered = hovered;
  }
}
