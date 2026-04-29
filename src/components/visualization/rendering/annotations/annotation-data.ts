import AggregatedCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/aggregated-communication';
import { Building, City, District } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';

export interface AnnotationDataArgs {
  annotationId: number | undefined;
  mouseX: number;
  mouseY: number;
  wasMoved: boolean;
  isAssociated: boolean;
  entityId?: string;
  entity?:
    | City
    | District
    | Building
    | AggregatedCommunication;
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

  entityId?: string;

  entity?:
    | City
    | District
    | Building
    | AggregatedCommunication;

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
    entityId,
    entity,
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
    this.entityId = entityId;
    this.entity = entity;
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
