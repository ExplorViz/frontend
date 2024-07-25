import { Position } from 'collaboration/utils/web-socket-messages/types/position';
import { Quaternion } from 'collaboration/utils/web-socket-messages/types/quaternion';

export type JoinLobbyPayload = {
  userName: string;
  deviceId: string;
  position: Position;
  quaternion: Quaternion;
};
