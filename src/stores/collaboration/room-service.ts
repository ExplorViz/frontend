import { create } from 'zustand';
import { useAuthStore } from 'explorviz-frontend/src/stores/auth';
import { useRoomSerializerStore } from './room-serializer';
import {
  RoomListRecord,
  isRoomListRecord,
} from 'explorviz-frontend/src/utils/collaboration/room-payload/receivable/room-list';
import { RoomCreatedResponse } from 'explorviz-frontend/src/utils/collaboration/room-payload/receivable/room-created';
import { InitialRoomPayload } from 'explorviz-frontend/src/utils/collaboration/room-payload/sendable/initial-room';
import {
  LobbyJoinedResponse,
  isLobbyJoinedResponse,
} from 'explorviz-frontend/src/utils/collaboration/room-payload/receivable/lobby-joined';

const collaborationService = import.meta.env.VITE_COLLAB_SERV_URL;

interface RoomServiceState {
  listRooms: () => Promise<RoomListRecord[]>;
  createRoom: (roomId?: string) => Promise<RoomCreatedResponse>;
  _buildInitialRoomPayload: (roomId: string) => InitialRoomPayload | undefined;
  joinLobby: (roomId: string) => Promise<LobbyJoinedResponse>;
}

export const useRoomServiceStore = create<RoomServiceState>((set, get) => ({
  listRooms: async (): Promise<RoomListRecord[]> => {
    const url = `${collaborationService}/rooms`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
      },
    });
    const records = await response.json();
    if (Array.isArray(records) && records.every(isRoomListRecord)) {
      return records;
    }
    throw new Error('invalid data');
  },

  createRoom: async (roomId = ''): Promise<RoomCreatedResponse> => {
    const payload = get()._buildInitialRoomPayload(roomId);

    if (!payload?.landscape.landscapeToken) {
      throw new Error('invalid data');
    }

    const url = `${collaborationService}/room`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const json = await response.json();
    return json;
  },

  // private
  _buildInitialRoomPayload: (
    roomId: string
  ): InitialRoomPayload | undefined => {
    // Serialize room and remove unsupported properties.
    const room = useRoomSerializerStore.getState().serializeRoom();

    if (!room.landscape.landscapeToken) {
      return;
    }
    return {
      roomId,
      landscape: room.landscape,
      openApps: [], // TODO
      detachedMenus: room.detachedMenus.map(({ ...menu }) => menu),
      annotations: room.annotations!.map(({ ...annotation }) => annotation),
    };
  },

  joinLobby: async (roomId: string): Promise<LobbyJoinedResponse> => {
    const url = `${collaborationService}/room/${roomId}/lobby`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    const json = await response.json();
    if (isLobbyJoinedResponse(json)) {
      return json;
    }
    throw new Error('invalid data');
  },
}));
