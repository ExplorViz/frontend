import Service, { inject as service } from '@ember/service';
import ApplicationRenderer, {
  AddApplicationArgs,
} from 'explorviz-frontend/services/application-renderer';
import LandscapeTokenService from 'explorviz-frontend/services/landscape-token';
import LinkRenderer from 'explorviz-frontend/services/link-renderer';
import TimestampService from 'explorviz-frontend/services/timestamp';
import { isTrace } from 'explorviz-frontend/utils/landscape-schemes/dynamic/dynamic-data';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import ClazzCommunicationMesh from 'explorviz-frontend/view-objects/3d/application/clazz-communication-mesh';
import ClazzMesh from 'explorviz-frontend/view-objects/3d/application/clazz-mesh';
import ComponentMesh from 'explorviz-frontend/view-objects/3d/application/component-mesh';
import FoundationMesh from 'explorviz-frontend/view-objects/3d/application/foundation-mesh';
import * as THREE from 'three';
import DetachedMenuGroupsService from 'extended-reality/services/detached-menu-groups';
import {
  DetachableMenu,
  isDetachableMenu,
} from 'extended-reality/utils/vr-menus/detachable-menu';
import {
  SerializedAnnotation,
  SerializedApp,
  SerializedDetachedMenu,
  SerializedHighlightedComponent,
  SerializedLandscape,
  SerializedPopup,
  SerializedRoom,
} from 'collaboration/utils/web-socket-messages/types/serialized-room';
import PopupData from 'explorviz-frontend/components/visualization/rendering/popups/popup-data';
import AnnotationData from 'explorviz-frontend/components/visualization/rendering/annotations/annotation-data';

export default class RoomSerializer extends Service {
  @service('application-renderer')
  private applicationRenderer!: ApplicationRenderer;

  @service('detached-menu-groups')
  private detachedMenuGroups!: DetachedMenuGroupsService;

  @service('landscape-token')
  private landscapeTokenService!: LandscapeTokenService;

  @service('link-renderer')
  private linkRenderer!: LinkRenderer;

  @service('timestamp')
  private timestampService!: TimestampService;

  public serializedRoom?: SerializedRoom;

  /**
   * Creates a JSON object for the current state of the room.
   */
  serializeRoom(
    popupData: PopupData[] = [],
    annotationData: AnnotationData[] = [],
    snapshot: boolean = false
  ): SerializedRoom {
    const serializedRoom = {
      landscape: this.serializeLandscape(),
      openApps: this.serializeOpenApplications(),
      highlightedExternCommunicationLinks:
        this.serializehighlightedExternCommunicationLinks(),
      popups: this.serializeOpenPopups(popupData, snapshot),
      annotations: this.serializeOpenAnnotations(annotationData, snapshot),
      detachedMenus: this.serializeDetachedMenus(),
    };
    return serializedRoom;
  }

  // ToDo: Add both global and local positions
  private serializeLandscape(): SerializedLandscape {
    return {
      landscapeToken: this.landscapeTokenService.token?.value,
      timestamp: this.timestampService.timestamp,
    };
  }

  // ToDo: Add both global and local positions
  private serializeOpenApplications(): SerializedApp[] {
    return this.applicationRenderer
      .getOpenApplications()
      .map((application) => this.serializeApplication(application));
  }

  serializeApplication(application: ApplicationObject3D) {
    // collect transparent extern links
    const transparentExternLinks: Set<string> = new Set();
    this.linkRenderer.getAllLinks().forEach((link) => {
      if (link.dataModel.application.id === application.getModelId()) {
        if (link.material.opacity !== 1) {
          transparentExternLinks.add(link.getModelId());
        }
      }
    });

    return {
      id: application.getModelId(),
      position: application.position.toArray(),
      quaternion: application.quaternion.toArray(),
      scale: application.scale.toArray(),
      openComponents: Array.from(application.openComponentIds),
      transparentComponents: Array.from(
        new Set([
          ...application.transparentComponentIds,
          ...transparentExternLinks,
        ])
      ),
      highlightedComponents: this.serializeHighlightedComponent(application),
    };
  }

  serializeToAddApplicationArgs(
    application: ApplicationObject3D | SerializedApp
  ): AddApplicationArgs {
    let serializedApp;
    if (application instanceof ApplicationObject3D) {
      serializedApp = this.serializeApplication(application);
    } else {
      serializedApp = application;
    }

    return {
      position: new THREE.Vector3(...serializedApp.position),
      quaternion: new THREE.Quaternion(...serializedApp.quaternion),
      scale: new THREE.Vector3(...serializedApp.scale),
      openComponents: new Set(serializedApp.openComponents),
      transparentComponents: new Set(serializedApp.transparentComponents),
      highlightedComponents: serializedApp.highlightedComponents.map(
        (highlightedComponent) => ({
          entityType: highlightedComponent.entityType,
          entityId: highlightedComponent.entityId,
          color: new THREE.Color().fromArray(highlightedComponent.color),
        })
      ),
    };
  }

  private serializeHighlightedComponent(application: ApplicationObject3D) {
    const { highlightedEntity } = application;
    if (highlightedEntity && !isTrace(highlightedEntity)) {
      const list: {
        appId: string;
        userId: string;
        entityType: string;
        entityId: string;
        isHighlighted: boolean;
        color: number[];
      }[] = [];

      Array.from(highlightedEntity.keys()).forEach((meshId) => {
        const color = application
          .getMeshById(meshId)
          ?.highlightingColor.toArray();
        const entityType = application.getMeshById(meshId);
        if (color && entityType) {
          const item = {
            appId: application.getModelId(),
            userId: '1',
            entityType: entityType.constructor.name,
            entityId: (
              application.getMeshById(meshId) as
                | ComponentMesh
                | ClazzMesh
                | ClazzCommunicationMesh
                | FoundationMesh
            ).getModelId(),
            isHighlighted: true,
            color: color,
          };
          list.push(item);
        }
      });

      return list;
    }
    return [];
  }

  /**
   * Change that if snapshot is created, that the pop up does not need to be shared
   * We always want to save a popup if pinned
   * @param popupData
   * @returns
   */
  private serializeOpenPopups(
    popupData: PopupData[],
    snapshot: boolean
  ): SerializedPopup[] {
    return popupData
      .filter((popup) => {
        return (
          (popup.isPinned && popup.sharedBy) || (popup.isPinned && snapshot)
        );
      })
      .map((popup) => {
        return {
          userId: popup.sharedBy,
          entityId: popup.mesh.dataModel.id,
          menuId: popup.menuId,
        };
      });
  }

  private serializeOpenAnnotations(
    annotationData: AnnotationData[],
    snapshot: boolean
  ): SerializedAnnotation[] {
    return annotationData
      .filter((annotation) => {
        return annotation.shared || snapshot;
      })
      .map((annotation) => {
        let entityId = undefined;

        if (annotation.entity !== undefined) {
          entityId = annotation.entity.id;
        }
        return {
          objectId: null,
          annotationId: annotation.annotationId,
          userId: annotation.sharedBy,
          entityId: entityId,
          menuId: annotation.menuId,
          annotationText: annotation.annotationText,
          annotationTitle: annotation.annotationTitle,
          owner: annotation.owner,
          shared: snapshot ? false : true,
          inEdit: annotation.inEdit,
          lastEditor: annotation.lastEditor,
        };
      });
  }

  private serializeDetachedMenus(): SerializedDetachedMenu[] {
    return this.detachedMenuGroups
      .getDetachedMenus()
      .filter((detachedMenuGroup) =>
        isDetachableMenu(detachedMenuGroup.currentMenu)
      )
      .map((detachedMenuGroup) => {
        const detachedMenu = detachedMenuGroup.currentMenu as DetachableMenu;
        return {
          userId: null, // TODO Check if this works
          objectId: detachedMenuGroup.getGrabId(),
          entityId: detachedMenu.getDetachId(),
          entityType: detachedMenu.getEntityType(),
          position: detachedMenuGroup
            .getWorldPosition(new THREE.Vector3())
            .toArray(),
          quaternion: detachedMenuGroup
            .getWorldQuaternion(new THREE.Quaternion())
            .toArray(),
          scale: detachedMenuGroup.scale.toArray(),
        };
      });
  }

  private serializehighlightedExternCommunicationLinks(): SerializedHighlightedComponent[] {
    return this.linkRenderer
      .getAllLinks()
      .filter((externLinkMesh) => externLinkMesh.highlighted)
      .map((externLinkMesh) => {
        const color = (externLinkMesh.material as THREE.MeshBasicMaterial)
          .color;
        return {
          userId: '', // TODO: userId
          appId: '',
          entityType: 'ClazzCommunicationMesh',
          entityId: externLinkMesh.getModelId(),
          isHighlighted: externLinkMesh.highlighted,
          color: [color.r, color.g, color.b],
        };
      });
  }
}

declare module '@ember/service' {
  interface Registry {
    'room-serializer': RoomSerializer;
  }
}
