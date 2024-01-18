import Service, { inject as service } from '@ember/service';
import ENV from 'explorviz-frontend/config/environment';
import Auth from 'explorviz-frontend/services/auth';
import { InitialRoomPayload } from 'virtual-reality/utils/vr-payload/sendable/initial-room';
import {
  isLobbyJoinedResponse,
  LobbyJoinedResponse,
} from '../utils/vr-payload/receivable/lobby-joined';
import { RoomCreatedResponse } from '../utils/vr-payload/receivable/room-created';
import {
  isRoomListRecord,
  RoomListRecord,
} from '../utils/vr-payload/receivable/room-list';
import VrRoomSerializer from './vr-room-serializer';
const { collaborationService } = ENV.backendAddresses;

export default class VrRoomService extends Service {
  @service('auth')
  private auth!: Auth;

  @service('virtual-reality@vr-room-serializer')
  private roomSerializer!: VrRoomSerializer;

  async listRooms(): Promise<RoomListRecord[]> {
    const url = `${collaborationService}/rooms`;
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

  async createRoom(roomId = ''): Promise<RoomCreatedResponse> {
    const payload = this.buildInitialRoomPayload(roomId);

    if (!payload?.landscape.landscapeToken) {
      throw new Error('invalid data');
    }

    const url = `${collaborationService}/room`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.auth.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const json = await response.json();
    return json;
  }

  private buildInitialRoomPayload(
    roomId: string
  ): InitialRoomPayload | undefined {
    // Serialize room and remove unsupported properties.
    const room = this.roomSerializer.serializeRoom();

    if (!room.landscape.landscapeToken) {
      return;
    }
    return {
      roomId,
      landscape: room.landscape,
      openApps: room.openApps.map(({ ...app }) => app),
      detachedMenus: room.detachedMenus.map(({ ...menu }) => menu),
    };
  }

  async joinLobby(roomId: string): Promise<LobbyJoinedResponse> {
    const url = `${collaborationService}/room/${roomId}/lobby`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.auth.accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    const json = await response.json();
    if (isLobbyJoinedResponse(json)) return json;
    throw new Error('invalid data');
  }
}

declare module '@ember/service' {
  interface Registry {
    'vr-room': VrRoomService;
  }
}
