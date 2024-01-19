import {
  Scale,
  isScale,
} from 'collaborative-mode/utils/web-socket-messages/types/Scale';
import {
  Position,
  isPosition,
} from 'collaborative-mode/utils/web-socket-messages/types/position';
import {
  Quaternion,
  isQuaternion,
} from 'collaborative-mode/utils/web-socket-messages/types/quaternion';

export const OBJECT_MOVED_EVENT = 'object_moved';

export type ObjectMovedMessage = {
  event: typeof OBJECT_MOVED_EVENT;
  objectId: string;
  position: Position;
  quaternion: Quaternion;
  scale: Scale;
};

export function isObjectMovedMessage(msg: any): msg is ObjectMovedMessage {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    msg.event === OBJECT_MOVED_EVENT &&
    typeof msg.objectId === 'string' &&
    isPosition(msg.position) &&
    isQuaternion(msg.quaternion) &&
    isScale(msg.scale)
  );
}
