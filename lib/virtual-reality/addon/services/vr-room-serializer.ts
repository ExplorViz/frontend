import Service, { inject as service } from '@ember/service';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import LandscapeRenderer from 'explorviz-frontend/services/landscape-renderer';
import TimestampService from 'explorviz-frontend/services/timestamp';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import ClazzCommunicationMesh from 'explorviz-frontend/view-objects/3d/application/clazz-communication-mesh';
import ClazzMesh from 'explorviz-frontend/view-objects/3d/application/clazz-mesh';
import ComponentMesh from 'explorviz-frontend/view-objects/3d/application/component-mesh';
import THREE from 'three';
import DetachedMenuGroupsService from 'virtual-reality/services/detached-menu-groups';
import { DetachableMenu, isDetachableMenu } from 'virtual-reality/utils/vr-menus/detachable-menu';
import {
  SerializedDetachedMenu, SerializedLandscape, SerializedVrRoom, SerialzedApp
} from 'virtual-reality/utils/vr-multi-user/serialized-vr-room';

export default class VrRoomSerializer extends Service {
  @service('detached-menu-groups')
  private detachedMenuGroups!: DetachedMenuGroupsService;

  @service('application-renderer')
  private applicationRenderer!: ApplicationRenderer;

  @service('landscape-renderer')
  private landscapeRenderer!: LandscapeRenderer;

  @service('timestamp')
  private timestampService!: TimestampService;

  serializedRoom?: SerializedVrRoom;

  /**
   * Creates a JSON object for the current state of the room.
   */
  serializeRoom(): SerializedVrRoom {
    this.serializedRoom = {
      landscape: this.serializeLandscape(),
      openApps: this.serializeOpenApplications(),
      detachedMenus: this.serializeDetachedMenus(),
    };
    return this.serializedRoom
  }

  // ToDo: Add both global and local positions
  private serializeLandscape(): SerializedLandscape {
    const { landscapeObject3D } = this.landscapeRenderer;
    return {
      landscapeToken: landscapeObject3D.dataModel.landscapeToken,
      timestamp: this.timestampService.timestamp,
      position: landscapeObject3D
        .position
        .toArray(),
      quaternion: landscapeObject3D
        .quaternion
        .toArray(),
      scale: landscapeObject3D.scale.toArray(),
    };
  }

  // ToDo: Add both global and local positions
  private serializeOpenApplications(): SerialzedApp[] {
    return this.applicationRenderer
      .getOpenApplications()
      .map((application) => this.serializeApplication(application));
  }

  serializeApplication(application: ApplicationObject3D) {
    return {
      id: application.dataModel.id,
      position: application.position.toArray(),
      quaternion: application
        .quaternion
        .toArray(),
      scale: application.scale.toArray(),
      openComponents: Array.from(application.openComponentIds),
      highlightedComponents: this.serializeHighlightedComponent(application),
    }
  }

  private serializeHighlightedComponent(application: ApplicationObject3D) {
    const highlightedEntity = application.highlightedEntity;
    if (highlightedEntity && (
      highlightedEntity instanceof ComponentMesh
      || highlightedEntity instanceof ClazzMesh
      || highlightedEntity instanceof ClazzCommunicationMesh)) {
      return [{
        appId: application.dataModel.id,
        userId: '1',
        entityType: highlightedEntity.constructor.name,
        entityId: highlightedEntity.dataModel.id,
        isHighlighted: true,
      }]
    }
    return [];
  }

  private serializeDetachedMenus(): SerializedDetachedMenu[] {
    return this.detachedMenuGroups
      .getDetachedMenus()
      .filter((detachedMenuGroup) => isDetachableMenu(detachedMenuGroup.currentMenu))
      .map((detachedMenuGroup) => {
        const detachedMenu = detachedMenuGroup.currentMenu as DetachableMenu;
        return {
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
    'vr-room-serializer': VrRoomSerializer;
  }
}
