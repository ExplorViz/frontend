import Service, { inject as service } from '@ember/service';
import ApplicationRenderer, {
  AddApplicationArgs,
} from 'explorviz-frontend/services/application-renderer';
import LandscapeTokenService from 'explorviz-frontend/services/landscape-token';
import TimestampService from 'explorviz-frontend/services/timestamp';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import ClazzCommunicationMesh from 'explorviz-frontend/view-objects/3d/application/clazz-communication-mesh';
import ClazzMesh from 'explorviz-frontend/view-objects/3d/application/clazz-mesh';
import ComponentMesh from 'explorviz-frontend/view-objects/3d/application/component-mesh';
import * as THREE from 'three';
import DetachedMenuGroupsService from 'virtual-reality/services/detached-menu-groups';
import {
  DetachableMenu,
  isDetachableMenu,
} from 'virtual-reality/utils/vr-menus/detachable-menu';
import {
  SerializedApp,
  SerializedDetachedMenu,
  SerializedLandscape,
  SerializedVrRoom,
} from 'virtual-reality/utils/vr-multi-user/serialized-vr-room';

export default class VrRoomSerializer extends Service {
  @service('detached-menu-groups')
  private detachedMenuGroups!: DetachedMenuGroupsService;

  @service('application-renderer')
  private applicationRenderer!: ApplicationRenderer;

  @service('timestamp')
  private timestampService!: TimestampService;

  @service('landscape-token')
  landscapeTokenService!: LandscapeTokenService;

  serializedRoom?: SerializedVrRoom;

  /**
   * Creates a JSON object for the current state of the room.
   */
  serializeRoom(): SerializedVrRoom {
    this.serializedRoom = {
      landscape: this.serializeLandscape(),
      openApps: this.serializeOpenApplications(),
      detachedMenus: this.serializeDetachedMenus(),
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
    return {
      id: application.getModelId(),
      position: application.position.toArray(),
      quaternion: application.quaternion.toArray(),
      scale: application.scale.toArray(),
      openComponents: Array.from(application.openComponentIds),
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
      highlightedComponents: serializedApp.highlightedComponents.map(
        (highlightedComponent) => ({
          entityType: highlightedComponent.entityType,
          entityId: highlightedComponent.entityId,
        })
      ),
    };
  }

  private serializeHighlightedComponent(application: ApplicationObject3D) {
    const { highlightedEntity } = application;
    if (
      highlightedEntity &&
      (highlightedEntity instanceof ComponentMesh ||
        highlightedEntity instanceof ClazzMesh ||
        highlightedEntity instanceof ClazzCommunicationMesh)
    ) {
      return [
        {
          appId: application.getModelId(),
          userId: '1',
          entityType: highlightedEntity.constructor.name,
          entityId: highlightedEntity.getModelId(),
          isHighlighted: true,
        },
      ];
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
}

declare module '@ember/service' {
  interface Registry {
    'virtual-reality@vr-room-serializer': VrRoomSerializer;
  }
}
