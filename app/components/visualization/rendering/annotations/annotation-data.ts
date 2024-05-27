import { tracked } from '@glimmer/tracking';
import { EntityMesh } from 'extended-reality/utils/vr-helpers/detail-info-composer';
import {
  Application,
  Class,
  Node,
  Package,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import ClazzCommuMeshDataModel from 'explorviz-frontend/view-objects/3d/application/utils/clazz-communication-mesh-data-model';

export interface AnnotationDataArgs {
  mouseX: number;
  mouseY: number;
  wasMoved: boolean;
  isAssociated: boolean;
  entity?: Node | Application | Package | Class | ClazzCommuMeshDataModel;
  mesh?: EntityMesh;
  applicationId?: string;
  menuId: string | null;
  hovered: boolean;
  annotationText: string;
  annotationTitle: string;
}

export default class AnnotationData {
  static incrementer: number = 0;

  annotationId: number;

  @tracked
  mouseX: number;

  @tracked
  mouseY: number;

  @tracked
  wasMoved: boolean;

  isAssociated: boolean;

  entity?: Node | Application | Package | Class | ClazzCommuMeshDataModel;

  mesh?: EntityMesh;

  applicationId?: string;

  menuId: string | null;

  @tracked
  hovered: boolean;

  annotationText: string;

  annotationTitle: string;

  constructor({
    mouseX,
    mouseY,
    wasMoved,
    isAssociated,
    entity,
    mesh,
    applicationId,
    menuId,
    hovered,
    annotationText,
    annotationTitle,
  }: AnnotationDataArgs) {
    this.annotationId = AnnotationData.incrementer;
    AnnotationData.incrementer++;
    this.mouseX = mouseX;
    this.mouseY = mouseY;
    this.wasMoved = wasMoved;
    this.isAssociated = isAssociated;
    this.entity = entity;
    this.mesh = mesh;
    this.applicationId = applicationId;
    this.menuId = menuId;
    this.hovered = hovered;
    this.annotationText = annotationText;
    this.annotationTitle = annotationTitle;
  }
}
