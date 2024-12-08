import { Position } from 'explorviz-frontend/utils/collaboration/web-socket-messages/types/position';
import { Quaternion } from 'explorviz-frontend/utils/collaboration/web-socket-messages/types/quaternion';

export type JoinLobbyPayload = {
  userName: string;
  deviceId: string;
  position: Position;
  quaternion: Quaternion;
};
