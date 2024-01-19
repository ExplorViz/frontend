import { Position } from 'collaborative-mode/utils/web-socket-messages/types/position';
import { Quaternion } from 'collaborative-mode/utils/web-socket-messages/types/quaternion';

export type JoinLobbyPayload = {
  userName: string;
  deviceId: string;
  position: Position;
  quaternion: Quaternion;
};
