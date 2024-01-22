import { Color, isColor } from '../types/color';
import { Position, isPosition } from '../types/position';
import { Quaternion, isQuaternion } from '../types/quaternion';

export const USER_CONNECTED_EVENT = 'user_connected';

export type UserConnectedMessage = {
  event: typeof USER_CONNECTED_EVENT;
  id: string;
  name: string;
  color: Color;
  position: Position;
  quaternion: Quaternion;
};

export function isUserConnectedMessage(msg: any): msg is UserConnectedMessage {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    msg.event === USER_CONNECTED_EVENT &&
    typeof msg.id === 'string' &&
    typeof msg.name === 'string' &&
    isColor(msg.color) &&
    isPosition(msg.position) &&
    isQuaternion(msg.quaternion)
  );
}
