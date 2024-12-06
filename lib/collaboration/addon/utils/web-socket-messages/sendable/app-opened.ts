import { Scale, isScale } from '../types/Scale';
import { Position, isPosition } from '../types/position';
import { Quaternion, isQuaternion } from '../types/quaternion';

export const APP_OPENED_EVENT = 'app_opened';

export type AppOpenedMessage = {
  event: typeof APP_OPENED_EVENT;
  id: string;
  position: Position;
  quaternion: Quaternion;
  scale: Scale;
};

export function isAppOpenedMessage(msg: any): msg is AppOpenedMessage {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    msg.event === APP_OPENED_EVENT &&
    typeof msg.id === 'string' &&
    isPosition(msg.position) &&
    isQuaternion(msg.quaternion) &&
    isScale(msg.scale)
  );
}
