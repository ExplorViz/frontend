import Service, { inject as service } from '@ember/service';
import ENV from 'explorviz-frontend/config/environment';
import Auth from 'explorviz-frontend/services/auth';
import RoomSerializer from './room-serializer';
import {
  RoomListRecord,
  isRoomListRecord,
} from 'collaboration/utils/room-payload/receivable/room-list';
import { RoomCreatedResponse } from 'collaboration/utils/room-payload/receivable/room-created';
import { InitialRoomPayload } from 'collaboration/utils/room-payload/sendable/initial-room';
import {
  LobbyJoinedResponse,
  isLobbyJoinedResponse,
} from 'collaboration/utils/room-payload/receivable/lobby-joined';
const { collaborationService } = ENV.backendAddresses;

export default class RoomService extends Service {
  @service('auth')
  private auth!: Auth;

  @service('room-serializer')
  private roomSerializer!: RoomSerializer;

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
    if (isLobbyJoinedResponse(json)) {
      return json;
    }
    throw new Error('invalid data');
  }
}

declare module '@ember/service' {
  interface Registry {
    'room-service': RoomService;
  }
}
