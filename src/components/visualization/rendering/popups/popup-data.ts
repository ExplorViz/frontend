import {
  Application,
  Class,
  Method,
  Node,
  Package,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import ClazzCommuMeshDataModel from 'explorviz-frontend/src/view-objects/3d/application/utils/clazz-communication-mesh-data-model';
import { K8sDataModel } from 'explorviz-frontend/src/view-objects/3d/k8s/k8s-mesh';
import { EntityMesh } from 'explorviz-frontend/src/utils/extended-reality/vr-helpers/detail-info-composer';

export interface PopupDataArgs {
  mouseX: number;
  mouseY: number;
  wasMoved: boolean;
  entity:
    | K8sDataModel
    | Node
    | Application
    | Package
    | Class
    | ClazzCommuMeshDataModel;
  mesh: EntityMesh;
  applicationId: string;
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

  entity:
    | K8sDataModel
    | Node
    | Application
    | Package
    | Class
    | ClazzCommuMeshDataModel
    | Method;

  mesh: EntityMesh;

  applicationId: string;

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
