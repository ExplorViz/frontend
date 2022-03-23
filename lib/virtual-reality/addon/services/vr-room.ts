import Service, { inject as service } from '@ember/service';
import LocalUser from 'collaborative-mode/services/local-user';
import ENV from 'explorviz-frontend/config/environment';
import Auth from 'explorviz-frontend/services/auth';
import LandscapeRenderer from 'explorviz-frontend/services/landscape-renderer';
import VrMenuFactoryService from 'explorviz-frontend/services/vr-menu-factory';
import THREE from 'three';
import DetachedMenuGroupsService from 'virtual-reality/services/detached-menu-groups';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import { isEntityMesh } from 'virtual-reality/utils/vr-helpers/detail-info-composer';
import { SerializedVrRoom } from 'virtual-reality/utils/vr-multi-user/serialized-vr-room';
import { InitialRoomPayload } from 'virtual-reality/utils/vr-payload/sendable/initial-room';
import * as VrPose from '../utils/vr-helpers/vr-poses';
import { isLobbyJoinedResponse, LobbyJoinedResponse } from '../utils/vr-payload/receivable/lobby-joined';
import { isRoomCreatedResponse, RoomCreatedResponse } from '../utils/vr-payload/receivable/room-created';
import { isRoomListRecord, RoomListRecord } from '../utils/vr-payload/receivable/room-list';
import { JoinLobbyPayload } from '../utils/vr-payload/sendable/join-lobby';
import RemoteVrUserService from './remote-vr-users';
import VrRoomSerializer from './vr-room-serializer';
import VrSceneService from './vr-scene';

const { collaborationService } = ENV.backendAddresses;

export default class VrRoomService extends Service {
  @service('auth')
  private auth!: Auth;

  @service('detached-menu-groups')
  private detachedMenuGroups!: DetachedMenuGroupsService;

  @service('local-user')
  private localUser!: LocalUser;

  @service('remote-vr-users')
  private remoteUsers!: RemoteVrUserService;

  @service('application-renderer')
  private applicationRenderer!: ApplicationRenderer;

  @service('landscape-renderer')
  private landscapeRenderer!: LandscapeRenderer;

  @service('vr-menu-factory')
  private menuFactory!: VrMenuFactoryService;

  @service('vr-room-serializer')
  private roomSerializer!: VrRoomSerializer;

  @service('vr-scene')
  private sceneService!: VrSceneService;

  async listRooms(): Promise<RoomListRecord[]> {
    const url = `${collaborationService}/v2/vr/rooms`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.auth.accessToken}`,
      },
    });
    const records = await response.json();
    if (Array.isArray(records) && records.every(isRoomListRecord)) {
      return records;
    }
    throw new Error('invalid data');
  }

  async createRoom(): Promise<RoomCreatedResponse> {
    const url = `${collaborationService}/v2/vr/room`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.auth.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(this.buildInitialRoomPayload()),
    });
    const json = await response.json();
    if (isRoomCreatedResponse(json)) return json;
    throw new Error('invalid data');
  }

  saveCurrentRoomLayout(): SerializedVrRoom {
    const {
      landscape,
      openApps,
      detachedMenus,
    } = this.buildInitialRoomPayload();
    return {
      landscape,
      openApps: openApps.map((app) => ({ highlightedComponents: [], ...app })),
      detachedMenus: detachedMenus.map((menu) => ({ objectId: null, ...menu })),
    };
  }

  async restoreRoomLayout({
    detachedMenus,
    openApps,
    landscape,
  }: SerializedVrRoom) {
    this.applicationRenderer.removeAllApplicationsLocally();
    this.detachedMenuGroups.removeAllDetachedMenusLocally();

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
      const application = this.applicationRenderer.getApplicationInCurrentLandscapeById(
        app.id,
      );
      if (application) {
        tasks.push(
          this.applicationRenderer.addApplicationLocally(application, {
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

  private buildInitialRoomPayload(): InitialRoomPayload {
    // Serialize room and remove unsupported properties.
    const room = this.roomSerializer.serializeRoom();
    return {
      landscape: room.landscape,
      openApps: room.openApps.map(({ highlightedComponents, ...app }) => app),
      detachedMenus: room.detachedMenus.map(({ objectId, ...menu }) => menu),
    };
  }

  async joinLobby(roomId: string): Promise<LobbyJoinedResponse> {
    const url = `${collaborationService}/v2/vr/room/${roomId}/lobby`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.auth.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(this.buildJoinLobbyPayload()),
    });
    const json = await response.json();
    if (isLobbyJoinedResponse(json)) return json;
    throw new Error('invalid data');
  }

  private buildJoinLobbyPayload(): JoinLobbyPayload | null {
    if (!this.auth.user) return null;
    return {
      userName: this.auth.user.nickname,
      ...VrPose.getCameraPose(this.localUser.camera),
    };
  }
}

declare module '@ember/service' {
  interface Registry {
    'vr-room': VrRoomService;
  }
}
