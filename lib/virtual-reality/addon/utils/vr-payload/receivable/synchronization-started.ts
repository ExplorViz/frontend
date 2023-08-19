import { ProjectorConfigurations } from 'collaborative-mode/services/synchronization-session';
import { LobbyJoinedResponse } from './lobby-joined';
import { RoomCreatedResponse } from './room-created';

export type SynchronizationStartedResponse = {
  projectorConfigurations: ProjectorConfigurations;
  roomResponse: RoomCreatedResponse;
  joinResponse: LobbyJoinedResponse;
};

export function isSynchronizationStartedResponse(
  response: any
): response is SynchronizationStartedResponse {
  return (
    response !== null &&
    typeof response === 'object' &&
    typeof response.projectorConfigurations === 'object' &&
    typeof response.roomResponse === 'object' &&
    typeof response.roomResponse.roomId === 'string' &&
    typeof response.joinResponse === 'object' &&
    typeof response.joinResponse.ticketId === 'string'
  );
}
