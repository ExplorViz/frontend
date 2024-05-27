import { setOwner } from '@ember/application';
import { action } from '@ember/object';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import AnnotationData from 'explorviz-frontend/components/visualization/rendering/annotations/annotation-data';
import { Position2D } from 'explorviz-frontend/modifiers/interaction-modifier';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import ToastHandlerService from 'explorviz-frontend/services/toast-handler';
import { isEntityMesh } from 'extended-reality/utils/vr-helpers/detail-info-composer';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import GrabbableForceGraph from 'explorviz-frontend/view-objects/3d/landscape/grabbable-force-graph';
import * as THREE from 'three';

export default class AnnotationHandler {
  @service('application-renderer')
  applicationRenderer!: ApplicationRenderer;

  @service('toast-handler')
  toastHandlerService!: ToastHandlerService;

  @tracked
  annotationData: AnnotationData[] = [];

  constructor(owner: any) {
    setOwner(this, owner);
  }

  @action
  clearAnnotations() {
    this.annotationData = [];
  }

  @action
  removeUnmovedAnnotations() {
    this.annotationData = this.annotationData.filter((data) => data.wasMoved);
  }

  @action
  removeAnnotation(annotationId: number) {
    const annotation = this.annotationData.find(
      (an) => an.annotationId === annotationId
    );
    if (!annotation) {
      return;
    }

    this.annotationData = this.annotationData.filter(
      (an) => an.annotationId !== annotationId
    );
  }

  @action
  handleHoverOnMesh(mesh?: THREE.Object3D) {
    if (isEntityMesh(mesh)) {
      this.annotationData.forEach((an) => {
        if (an.entity !== undefined) {
          an.hovered = an.entity.id === mesh.getModelId();
        }
      });
    } else {
      this.annotationData.forEach((an) => {
        an.hovered = false;
      });
    }
  }

  @action
  addAnnotation({
    mesh,
    position,
    wasMoved,
    menuId,
    hovered,
  }: {
    mesh?: THREE.Object3D;
    position: Position2D | undefined;
    wasMoved?: boolean;
    menuId?: string | null;
    hovered?: boolean;
  }) {
    let annotationPosition = position;

    if (!annotationPosition) {
      annotationPosition = {
        x: 100,
        y: 200 + this.annotationData.length * 50,
      };
    }

    let newAnnotation;

    if (!isEntityMesh(mesh)) {
      newAnnotation = new AnnotationData({
        mouseX: annotationPosition.x,
        mouseY: annotationPosition.y,
        wasMoved: true,
        isAssociated: false,
        entity: undefined,
        mesh: undefined,
        applicationId: undefined,
        menuId: menuId || null,
        hovered: hovered || false,
        annotationText: '',
        annotationTitle: '',
      });
    } else {
      newAnnotation = new AnnotationData({
        mouseX: annotationPosition.x,
        mouseY: annotationPosition.y,
        wasMoved: wasMoved || false,
        isAssociated: true,
        entity: mesh.dataModel,
        mesh,
        applicationId: (
          mesh.parent as ApplicationObject3D | GrabbableForceGraph
        ).getModelId(),
        menuId: menuId || null,
        hovered: hovered || false,
        annotationText: '',
        annotationTitle: '',
      });
    }

    // Check if annotation for entitiy already exists and update it if so
    if (newAnnotation.entity !== undefined) {
      const maybeAnnotation = this.annotationData.find(
        (an) =>
          an.entity !== undefined && an.entity.id === newAnnotation.entity?.id
      );
      if (maybeAnnotation) {
        this.updateExistingAnnotation(maybeAnnotation, newAnnotation);
        return;
      }
    }

    this.annotationData = [...this.annotationData, newAnnotation];
  }

  private updateExistingAnnotation(
    annotation: AnnotationData,
    newAnnotation: AnnotationData
  ) {
    annotation.annotationText = newAnnotation.annotationText;
    annotation.annotationTitle = newAnnotation.annotationTitle;
    this.updateMeshReference(annotation);
  }

  @action
  onMenuClosed(menuId: string) {
    this.annotationData = this.annotationData.filter(
      (an) => an.menuId !== menuId
    );
  }

  @action
  updateMeshReference(annotation: AnnotationData) {
    if (annotation.entity !== undefined) {
      const mesh = this.applicationRenderer.getMeshById(annotation.entity.id);
      if (isEntityMesh(mesh)) {
        annotation.mesh = mesh;
      }
    }
  }
}
