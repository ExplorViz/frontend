import { Position } from '../../vr-message/util/position';
import { Quaternion } from '../../vr-message/util/quaternion';

export type JoinLobbyPayload = {
  userName: string;
  deviceId: string;
  position: Position;
  quaternion: Quaternion;
};
