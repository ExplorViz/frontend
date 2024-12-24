import { Position } from 'react-lib/src/utils/collaboration/web-socket-messages/types/position';
import { Quaternion } from 'react-lib/src/utils/collaboration/web-socket-messages/types/quaternion';

export type JoinLobbyPayload = {
  userName: string;
  deviceId: string;
  position: Position;
  quaternion: Quaternion;
};
