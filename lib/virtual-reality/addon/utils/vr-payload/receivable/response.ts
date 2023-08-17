import { LobbyJoinedResponse } from './lobby-joined';
import { RoomCreatedResponse } from './room-created';
import { RoomListRecord } from './room-list';
import { SynchronizationStartedResponse } from './synchronization-started';

export type response =
  | LobbyJoinedResponse
  | RoomCreatedResponse
  | RoomListRecord
  | SynchronizationStartedResponse;
