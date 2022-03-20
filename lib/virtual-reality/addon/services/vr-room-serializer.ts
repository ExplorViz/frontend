import Service, { inject as service } from '@ember/service';
import LandscapeRenderer from 'explorviz-frontend/services/landscape-renderer';
import VrMenuFactoryService from 'explorviz-frontend/services/vr-menu-factory';
import THREE from 'three';
import DetachedMenuGroupsService from 'virtual-reality/services/detached-menu-groups';
import VrApplicationRenderer from 'virtual-reality/services/vr-application-renderer';
import VrTimestampService from 'virtual-reality/services/vr-timestamp';
import { isEntityMesh } from 'virtual-reality/utils/vr-helpers/detail-info-composer';
import { DetachableMenu, isDetachableMenu } from 'virtual-reality/utils/vr-menus/detachable-menu';
import {
  SerializedDetachedMenu, SerializedLandscape, SerializedVrRoom, SerialzedApp,
} from 'virtual-reality/utils/vr-multi-user/serialized-vr-room';
import RemoteVrUserService from './remote-vr-users';
import VrSceneService from './vr-scene';

type RestoreOptions = {
  restoreLandscapeData: boolean;
};

export default class VrRoomSerializer extends Service {
  @service('detached-menu-groups')
  private detachedMenuGroups!: DetachedMenuGroupsService;

  @service('remote-vr-users')
  private remoteUsers!: RemoteVrUserService;

  @service('vr-application-renderer')
  private vrApplicationRenderer!: VrApplicationRenderer;

  @service('landscape-renderer')
  private landscapeRenderer!: LandscapeRenderer;

  @service('vr-menu-factory')
  private menuFactory!: VrMenuFactoryService;

  @service('vr-scene')
  private sceneService!: VrSceneService;

  @service('vr-timestamp')
  private timestampService!: VrTimestampService;

  /**
   * Runs the given action and tries to restore the previous state of the room
   * when it completes.
   */
  async preserveRoom(
    action: () => Promise<void>,
    restoreOptions?: RestoreOptions,
  ) {
    const room = this.serializeRoom();
    await action();
    this.restoreRoom(room, restoreOptions);
  }

  /**
   * Creates a JSON object for the current state of the room.
   */
  serializeRoom(): SerializedVrRoom {
    return {
      landscape: this.serializeLandscape(),
      openApps: this.serializeOpenApplications(),
      detachedMenus: this.serializeDetachedMenus(),
    };
  }

  /**
   * Restores a previously serialized room.
   */
  async restoreRoom(
    room: SerializedVrRoom,
    options: RestoreOptions = {
      restoreLandscapeData: true,
    },
  ) {
    // Reset room.
    this.vrApplicationRenderer.removeAllApplicationsLocally();
    this.detachedMenuGroups.removeAllDetachedMenusLocally();

    // Optionally restore landscape data.
    if (options.restoreLandscapeData) {
      await this.timestampService.updateLandscapeTokenLocally(
        room.landscape.landscapeToken,
        room.landscape.timestamp,
      );
    }

    // Restore landscape, apps and meus.
    await this.restoreRoomWithoutTimestamp(room);
  }

  private async restoreRoomWithoutTimestamp({
    detachedMenus,
    openApps,
    landscape,
  }: SerializedVrRoom) {
    // Initialize landscape.
    this.landscapeRenderer.landscapeObject3D.position.fromArray(
      landscape.position,
    );
    this.landscapeRenderer.landscapeObject3D.quaternion.fromArray(
      landscape.quaternion,
    );
    this.landscapeRenderer.landscapeObject3D.scale.fromArray(landscape.scale);

    // Initialize applications.
    const tasks: Promise<any>[] = [];
    openApps.forEach((app) => {
      const application = this.vrApplicationRenderer.getApplicationInCurrentLandscapeById(
        app.id,
      );
      if (application) {
        tasks.push(
          this.vrApplicationRenderer.addApplicationLocally(application, {
            position: new THREE.Vector3(...app.position),
            quaternion: new THREE.Quaternion(...app.quaternion),
            scale: new THREE.Vector3(...app.scale),
            openComponents: new Set(app.openComponents),
            highlightedComponents: app.highlightedComponents.map(
              (highlightedComponent) => ({
                entityType: highlightedComponent.entityType,
                entityId: highlightedComponent.entityId,
                color: this.remoteUsers.lookupRemoteUserById(
                  highlightedComponent.userId,
                )?.color,
              }),
            ),
          }),
        );
      }
    });

    // Wait for applications to be opened before opening the menus. Otherwise
    // the entities do not exist.
    await Promise.all(tasks);

    // Initialize detached menus.
    detachedMenus.forEach((detachedMenu) => {
      const object = this.sceneService.findMeshByModelId(
        detachedMenu.entityType,
        detachedMenu.entityId,
      );
      if (isEntityMesh(object)) {
        const menu = this.menuFactory.buildInfoMenu(object);
        menu.position.fromArray(detachedMenu.position);
        menu.quaternion.fromArray(detachedMenu.quaternion);
        menu.scale.fromArray(detachedMenu.scale);
        this.detachedMenuGroups.addDetachedMenuLocally(
          menu,
          detachedMenu.objectId,
        );
      }
    });
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
    return this.vrApplicationRenderer
      .getOpenApplications()
      .map((application) => ({
        id: application.dataModel.id,
        position: application.position.toArray(),
        quaternion: application
          .quaternion
          .toArray(),
        scale: application.scale.toArray(),
        openComponents: Array.from(application.openComponentIds),
        highlightedComponents: [],
      }));
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
