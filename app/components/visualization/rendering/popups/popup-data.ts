import { tracked } from '@glimmer/tracking';
import { EntityMesh } from 'virtual-reality/utils/vr-helpers/detail-info-composer';
import {
  Application,
  Class,
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

  wasMoved: boolean;

  entity: Node | Application | Package | Class | ClazzCommuMeshDataModel;

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
    isPinned,
    sharedBy,
    menuId,
    hovered,
  }: PopupDataArgs) {
    this.mouseX = mouseX;
    this.mouseY = mouseY;
    this.entity = entity;
    this.wasMoved = false;
    this.mesh = mesh;
    this.applicationId = applicationId;
    this.isPinned = isPinned;
    this.sharedBy = sharedBy;
    this.menuId = menuId;
    this.hovered = hovered;
  }

  get modelId(): string {
    if (this.mesh) {
      return this.mesh.getModelId();
    }

    return this.entity.id;
  }
}
