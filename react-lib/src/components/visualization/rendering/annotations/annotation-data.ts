import { EntityMesh } from 'explorviz-frontend/src/utils/extended-reality/vr-helpers/detail-info-composer';
import {
  Application,
  Class,
  Node,
  Package,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import ClazzCommuMeshDataModel from 'explorviz-frontend/src/view-objects/3d/application/utils/clazz-communication-mesh-data-model';
import { K8sDataModel } from 'explorviz-frontend/src/view-objects/3d/k8s/k8s-mesh';

export interface AnnotationDataArgs {
  annotationId: number | undefined;
  mouseX: number;
  mouseY: number;
  wasMoved: boolean;
  isAssociated: boolean;
  entity?:
    | Node
    | Application
    | Package
    | Class
    | ClazzCommuMeshDataModel
    | K8sDataModel;
  mesh?: EntityMesh;
  applicationId?: string;
  menuId: string | null;
  hovered: boolean;
  annotationText: string;
  annotationTitle: string;
  hidden: boolean;
  sharedBy: string;
  owner: string;
  shared: boolean;
  inEdit: boolean;
  lastEditor: string;
}

export default class AnnotationData {
  static incrementer: number = 0;

  annotationId: number;

  mouseX: number;

  mouseY: number;

  wasMoved: boolean;

  isAssociated: boolean;

  entity?:
    | Node
    | Application
    | Package
    | Class
    | ClazzCommuMeshDataModel
    | K8sDataModel;

  mesh?: EntityMesh;

  applicationId?: string;

  menuId: string | null;

  // @tracked
  hovered: boolean;

  // @tracked
  annotationText: string;

  // @tracked
  annotationTitle: string;

  // @tracked
  hidden: boolean;

  // @tracked
  sharedBy: string;

  // @tracked
  shared: boolean;

  // @tracked
  owner: string;

  // @tracked
  inEdit: boolean;

  // @tracked
  lastEditor: string;

  constructor({
    annotationId,
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
    hidden,
    sharedBy,
    shared,
    owner,
    inEdit,
    lastEditor,
  }: AnnotationDataArgs) {
    if (annotationId) {
      this.annotationId = annotationId;
      AnnotationData.incrementer = annotationId + 1;
    } else {
      this.annotationId = AnnotationData.incrementer;
      AnnotationData.incrementer++;
    }
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
    this.hidden = hidden;
    this.sharedBy = sharedBy;
    this.owner = owner;
    this.shared = shared;
    this.inEdit = inEdit;
    this.lastEditor = lastEditor;
  }
}
