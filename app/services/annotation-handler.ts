import Service from '@ember/service';
import { action } from '@ember/object';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import AnnotationData from 'explorviz-frontend/components/visualization/rendering/annotations/annotation-data';
import { Position2D } from 'explorviz-frontend/modifiers/interaction-modifier';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import ToastHandlerService from 'explorviz-frontend/services/toast-handler';
import {
  getTypeOfEntity,
  isEntityMesh,
} from 'extended-reality/utils/vr-helpers/detail-info-composer';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import GrabbableForceGraph from 'explorviz-frontend/view-objects/3d/landscape/grabbable-force-graph';
import * as THREE from 'three';
import { SerializedAnnotation } from 'collaboration/utils/web-socket-messages/types/serialized-room';
import DetachedMenuRenderer from 'extended-reality/services/detached-menu-renderer';
import WebSocketService from 'collaboration/services/web-socket';
import { ForwardedMessage } from 'collaboration/utils/web-socket-messages/receivable/forwarded';
import LocalUser from 'collaboration/services/local-user';
import {
  ANNOTATION_OPENED_EVENT,
  AnnotationOpenedMessage,
} from 'collaboration/utils/web-socket-messages/sendable/annotation-opened';
import { ANNOTATION_CLOSED_EVENT } from 'collaboration/utils/web-socket-messages/sendable/annotation-closed';
import { AnnotationForwardMessage } from 'collaboration/utils/web-socket-messages/receivable/annotation-forward';
import {
  AnnotationResponse,
  isAnnotationResponse,
} from 'collaboration/utils/web-socket-messages/receivable/response/annotation-response';

export default class AnnotationHandlerService extends Service {
  @service('application-renderer')
  applicationRenderer!: ApplicationRenderer;

  @service('detached-menu-renderer')
  detachedMenuRenderer!: DetachedMenuRenderer;

  @service('local-user')
  private localUser!: LocalUser;

  @service('toast-handler')
  toastHandlerService!: ToastHandlerService;

  @service('web-socket')
  private webSocket!: WebSocketService;

  @tracked
  annotationData: AnnotationData[] = [];

  minimizedAnnotations: AnnotationData[] = [];

  init() {
    this.webSocket.on(ANNOTATION_OPENED_EVENT, this, this.onAnnotation);
    this.webSocket.on(ANNOTATION_CLOSED_EVENT, this, this.onMenuClosed);
    this.detachedMenuRenderer.on(
      'restore_annotations',
      this,
      this.onRestoreAnnotations
    );
  }

  @action
  clearAnnotations() {
    this.annotationData.forEach((an) => {
      if (an.entity) {
        this.applicationRenderer.updateLabel(an.entity.id, '');
      }
    });

    this.annotationData = [];
  }

  @action
  removeUnmovedAnnotations() {
    const unmovedAnnotations = this.annotationData.filter(
      (data) => !data.wasMoved
    );
    this.annotationData = this.annotationData.filter((data) => data.wasMoved);

    unmovedAnnotations.forEach((an) => {
      if (an.entity) {
        this.applicationRenderer.updateLabel(an.entity.id, '');
      }
    });
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
  minimizeAnnotation(annotationId: number) {
    const annotation = this.annotationData.find(
      (an) => an.annotationId === annotationId
    );

    if (annotation) {
      // remove potential toggle effects
      if (annotation.entity) {
        const mesh = this.applicationRenderer.getMeshById(annotation.entity.id);
        if (mesh?.isHovered) {
          mesh.resetHoverEffect();
        }
      }

      annotation.wasMoved = false;

      this.minimizedAnnotations = [...this.minimizedAnnotations, annotation];
      this.annotationData = this.annotationData.filter(
        (an) => an.annotationId !== annotationId
      );
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

    // remove potential toggle effects
    if (annotation.entity) {
      const mesh = this.applicationRenderer.getMeshById(annotation.entity.id);
      if (mesh?.isHovered) {
        mesh.resetHoverEffect();
      }

      this.applicationRenderer.updateLabel(annotation.entity.id, '');
    }

    this.annotationData = this.annotationData.filter(
      (an) => an.annotationId !== annotationId
    );
  }

  @action
  shareAnnotation(annotation: AnnotationData) {
    this.updateMeshReference(annotation);

    let mesh = undefined;
    let entityId = undefined;
    let entityType = undefined;
    let worldPosition;

    if (annotation.mesh) {
      mesh = annotation.mesh;
      entityId = mesh.getModelId();
      entityType = getTypeOfEntity(mesh);
      worldPosition = this.applicationRenderer.getGraphPosition(mesh);
      worldPosition.y += 0.3;
    } else {
      worldPosition = new THREE.Vector3(0, 0, 0);
    }

    const applicationId = annotation.annotationId;
    this.applicationRenderer.forceGraph.worldToLocal(worldPosition);

    this.webSocket.sendRespondableMessage<
      AnnotationOpenedMessage,
      AnnotationResponse
    >(
      ANNOTATION_OPENED_EVENT,
      {
        event: ANNOTATION_OPENED_EVENT,
        annotationId: applicationId,
        entityId: entityId,
        entityType: entityType,
        position: worldPosition.toArray(),
        quaternion: [0, 0, 0, 0],
        scale: [1, 1, 1],
        menuId: annotation.menuId,
        annotationTitle: annotation.annotationTitle,
        annotationText: annotation.annotationText,
        nonce: 0,
      },
      {
        responseType: isAnnotationResponse,
        onResponse: (response: AnnotationResponse) => {
          annotation.sharedBy = this.localUser.userId;
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
    sharedBy,
  }: {
    mesh?: THREE.Object3D;
    position: Position2D | undefined;
    wasMoved?: boolean;
    menuId?: string | null;
    hovered?: boolean;
    annotationTitle: string;
    annotationText: string;
    sharedBy?: string;
  }) {
    let minimized = false;

    if (isEntityMesh(mesh)) {
      const annotation = this.minimizedAnnotations.filter(
        (an) => an.entity?.id === mesh.dataModel.id
      );
      if (annotation.length === 1) {
        this.annotationData = [...this.annotationData, annotation[0]];
        this.minimizedAnnotations = this.minimizedAnnotations.filter(
          (an) => an.annotationId !== annotation[0].annotationId
        );
        minimized = true;
      }
    }

    if (!minimized) {
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
          sharedBy: sharedBy || '',
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
          sharedBy: sharedBy || '',
        });

        this.applicationRenderer.updateLabel(
          newAnnotation.entity!.id,
          ' [annotated]'
        );
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
  }

  private updateExistingAnnotation(
    annotation: AnnotationData,
    newAnnotation: AnnotationData
  ) {
    annotation.annotationText = newAnnotation.annotationText;
    annotation.annotationTitle = newAnnotation.annotationTitle;
    this.updateMeshReference(annotation);
  }

  onAnnotation({
    objectId,
    userId,
    entityId,
    annotationTitle,
    annotationText,
  }: AnnotationForwardMessage) {
    let mesh = undefined;
    if (entityId) {
      mesh = this.applicationRenderer.getMeshById(entityId);
    }

    this.addAnnotation({
      mesh: mesh,
      position: undefined,
      wasMoved: true,
      menuId: objectId,
      hovered: false,
      annotationTitle: annotationTitle,
      annotationText: annotationText,
      sharedBy: userId,
    });
  }

  onRestoreAnnotations(annotations: SerializedAnnotation[]) {
    this.annotationData = [];

    for (const annotation of annotations) {
      let mesh;
      if (annotation.entityId !== undefined) {
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
  }: ForwardedMessage<AnnotationForwardMessage>): void {
    if (menuId !== undefined) {
      this.annotationData = this.annotationData.filter(
        (an) => an.menuId !== menuId
      );
    }
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
    this.annotationData = [];
    this.webSocket.off(ANNOTATION_OPENED_EVENT, this, this.onAnnotation);
    this.webSocket.off(ANNOTATION_CLOSED_EVENT, this, this.onMenuClosed);
    this.detachedMenuRenderer.off(
      'restore_annotations',
      this,
      this.onRestoreAnnotations
    );
  }
}

// Don't remove this declaration: this is what enables TypeScript to resolve
// this service using `Owner.lookup('service:annotation-handler')`, as well
// as to check when you pass the service name as an argument to the decorator,
// like `@service('annotation-handler') declare altName: AnnotationHandlerService;`.
declare module '@ember/service' {
  interface Registry {
    'annotation-handler': AnnotationHandlerService;
  }
}
