import Service, { inject as service } from '@ember/service';
import LocalUser from 'collaborative-mode/services/local-user';
import ENV from 'explorviz-frontend/config/environment';
import Auth from 'explorviz-frontend/services/auth';
import { InitialRoomPayload } from 'virtual-reality/utils/vr-payload/sendable/initial-room';
import * as VrPose from '../utils/vr-helpers/vr-poses';
import {
  isLobbyJoinedResponse,
  LobbyJoinedResponse,
} from '../utils/vr-payload/receivable/lobby-joined';
import {
  isRoomCreatedResponse,
  RoomCreatedResponse,
} from '../utils/vr-payload/receivable/room-created';
import {
  isRoomListRecord,
  RoomListRecord,
} from '../utils/vr-payload/receivable/room-list';
import { JoinLobbyPayload } from '../utils/vr-payload/sendable/join-lobby';
import VrRoomSerializer from './vr-room-serializer';
import SynchronizationSession from 'collaborative-mode/services/synchronization-session';

const { collaborationService } = ENV.backendAddresses;

export default class VrRoomService extends Service {
  @service('auth')
  private auth!: Auth;

  @service('local-user')
  private localUser!: LocalUser;

  @service('virtual-reality@vr-room-serializer')
  private roomSerializer!: VrRoomSerializer;

  @service('synchronization-session')
  synchronizationSession!: SynchronizationSession;

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
    const payload = this.buildInitialRoomPayload();

    if (!payload?.landscape.landscapeToken) {
      throw new Error('invalid data');
    }

    const url = `${collaborationService}/v2/vr/room`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.auth.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const json = await response.json();
    if (isRoomCreatedResponse(json)) return json;
    throw new Error('invalid data');
  }

  private buildInitialRoomPayload(): InitialRoomPayload | undefined {
    // Serialize room and remove unsupported properties.
    const room = this.roomSerializer.serializeRoom();

    if (!room.landscape.landscapeToken) {
      return;
    }

    return {
      landscape: room.landscape,
      openApps: room.openApps.map(({ ...app }) => app),
      detachedMenus: room.detachedMenus.map(({ ...menu }) => menu),
      // roomId will be set in the synchronizationSession, when synchronization is intented (query params)
      roomId: this.synchronizationSession.roomId,
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
