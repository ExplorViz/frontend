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
import { SerializedAnnotation } from 'collaboration/utils/web-socket-messages/types/serialized-room';
import DetachedMenuRenderer from 'extended-reality/services/detached-menu-renderer';
import WebSocketService from 'collaboration/services/web-socket';
import {
  DETACHED_MENU_CLOSED_EVENT,
  DetachedMenuClosedMessage,
} from 'extended-reality/utils/vr-web-wocket-messages/sendable/request/detached-menu-closed';
import { ForwardedMessage } from 'collaboration/utils/web-socket-messages/receivable/forwarded';
import {
  MENU_DETACHED_EVENT,
  MenuDetachedMessage,
} from 'extended-reality/utils/vr-web-wocket-messages/sendable/request/menu-detached';
import {
  MenuDetachedResponse,
  isMenuDetachedResponse,
} from 'extended-reality/utils/vr-web-wocket-messages/receivable/response/menu-detached';
import { COMPONENT_ENTITY_TYPE } from 'collaboration/utils/web-socket-messages/types/entity-type';

export default class AnnotationHandler {
  @service('application-renderer')
  applicationRenderer!: ApplicationRenderer;

  @service('detached-menu-renderer')
  detachedMenuRenderer!: DetachedMenuRenderer;

  @service('toast-handler')
  toastHandlerService!: ToastHandlerService;

  @service('web-socket')
  private webSocket!: WebSocketService;

  @tracked
  annotationData: AnnotationData[] = [];

  constructor(owner: any) {
    setOwner(this, owner);
    this.webSocket.on(DETACHED_MENU_CLOSED_EVENT, this, this.onMenuClosed);
    this.detachedMenuRenderer.on(
      'restore_annotations',
      this,
      this.onRestoreAnnotations
    );
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
  hideAnnotation(annotationId: number) {
    const annotation = this.annotationData.find(
      (an) => an.annotationId === annotationId
    );

    if (annotation) {
      if (annotation.hidden) {
        annotation.hidden = false;
      } else {
        annotation.hidden = true;
      }
    }
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
  shareAnnotation(annotation: AnnotationData) {
    this.updateMeshReference(annotation);

    const applicationId = annotation.annotationId;
    const worldPosition = new THREE.Vector3(0, 0, 0);
    this.applicationRenderer.forceGraph.worldToLocal(worldPosition);

    this.webSocket.sendRespondableMessage<
      MenuDetachedMessage,
      MenuDetachedResponse
    >(
      MENU_DETACHED_EVENT,
      {
        event: MENU_DETACHED_EVENT,
        detachId: applicationId.toString(),
        entityType: COMPONENT_ENTITY_TYPE, // vorläufig zum testen -> schwierig da Mesh auch undefined sein könnte
        position: worldPosition.toArray(),
        quaternion: [0, 0, 0, 0],
        scale: [1, 1, 1],
        nonce: 0,
      },
      {
        responseType: isMenuDetachedResponse,
        onResponse: (response: MenuDetachedResponse) => {
          annotation.menuId = response.objectId;
          return true;
        },
        onOffline: () => {
          // Not used at the moment
        },
      }
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
    annotationTitle,
    annotationText,
  }: {
    mesh?: THREE.Object3D;
    position: Position2D | undefined;
    wasMoved?: boolean;
    menuId?: string | null;
    hovered?: boolean;
    annotationTitle: string;
    annotationText: string;
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
        annotationText: annotationText,
        annotationTitle: annotationTitle,
        hidden: false,
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
        annotationText: annotationText,
        annotationTitle: annotationTitle,
        hidden: false,
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

  onRestoreAnnotations(annotations: SerializedAnnotation[]) {
    this.annotationData = [];

    for (const annotation of annotations) {
      let mesh;
      if (annotation.entityId) {
        mesh = this.applicationRenderer.getMeshById(annotation.entityId);
      } else {
        mesh = undefined;
      }

      this.addAnnotation({
        mesh: mesh,
        position: undefined,
        wasMoved: true,
        menuId: annotation.menuId,
        hovered: false,
        annotationTitle: annotation.annotationTitle,
        annotationText: annotation.annotationText,
      });
    }
  }

  @action
  onMenuClosed({
    originalMessage: { menuId },
  }: ForwardedMessage<DetachedMenuClosedMessage>): void {
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

  willDestroy() {
    this.webSocket.off(DETACHED_MENU_CLOSED_EVENT, this, this.onMenuClosed);
    this.detachedMenuRenderer.off(
      'restore_annotations',
      this,
      this.onRestoreAnnotations
    );
  }
}
