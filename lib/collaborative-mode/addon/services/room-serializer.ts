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
import DetachedMenuGroupsService from 'virtual-reality/services/detached-menu-groups';
import {
  DetachableMenu,
  isDetachableMenu,
} from 'virtual-reality/utils/vr-menus/detachable-menu';
import {
  SerializedApp,
  SerializedDetachedMenu,
  SerializedHighlightedComponent,
  SerializedLandscape,
  SerializedRoom,
} from 'collaborative-mode/utils/web-socket-messages/types/serialized-room';

export default class RoomSerializer extends Service {
  @service('detached-menu-groups')
  private detachedMenuGroups!: DetachedMenuGroupsService;

  @service('application-renderer')
  private applicationRenderer!: ApplicationRenderer;

  @service('link-renderer')
  private linkRenderer!: LinkRenderer;

  @service('timestamp')
  private timestampService!: TimestampService;

  @service('landscape-token')
  landscapeTokenService!: LandscapeTokenService;

  serializedRoom?: SerializedRoom;

  /**
   * Creates a JSON object for the current state of the room.
   */
  serializeRoom(): SerializedRoom {
    this.serializedRoom = {
      landscape: this.serializeLandscape(),
      openApps: this.serializeOpenApplications(),
      detachedMenus: this.serializeDetachedMenus(),
      highlightedExternCommunicationLinks:
        this.serializehighlightedExternCommunicationLinks(),
      // openPopups: this.serializeOpenPopups(),
    };
    return this.serializedRoom;
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
