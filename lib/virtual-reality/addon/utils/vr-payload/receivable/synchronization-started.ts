import { LobbyJoinedResponse } from './lobby-joined';
import { RoomCreatedResponse } from './room-created';

export type SynchronizationStartedResponse = {
  roomResponse: RoomCreatedResponse;
  joinResponse: LobbyJoinedResponse;
};

export function isSynchronizationStartedResponse(
  response: any
): response is SynchronizationStartedResponse {
  return (
    response !== null &&
    typeof response === 'object' &&
    typeof response.roomResponse === 'object' &&
    typeof response.joinResponse === 'object'
  );
}
