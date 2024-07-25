import {
  Scale,
  isScale,
} from 'collaboration/utils/web-socket-messages/types/Scale';
import {
  EntityType,
  isEntityType,
} from 'collaboration/utils/web-socket-messages/types/entity-type';
import {
  Position,
  isPosition,
} from 'collaboration/utils/web-socket-messages/types/position';
import {
  Quaternion,
  isQuaternion,
} from 'collaboration/utils/web-socket-messages/types/quaternion';

export const MENU_DETACHED_FORWARD_EVENT = 'menu_detached';

export type MenuDetachedForwardMessage = {
  event: typeof MENU_DETACHED_FORWARD_EVENT;
  objectId: string;
  userId: string;
  entityType: EntityType;
  detachId: string;
  position: Position;
  quaternion: Quaternion;
  scale: Scale;
};

export function isMenuDetachedForwardMessage(
  msg: any
): msg is MenuDetachedForwardMessage {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    msg.event === MENU_DETACHED_FORWARD_EVENT &&
    typeof msg.objectId === 'string' &&
    typeof msg.userId === 'string' &&
    isEntityType(msg.entityType) &&
    typeof msg.detachId === 'string' &&
    isPosition(msg.position) &&
    isQuaternion(msg.quaternion) &&
    isScale(msg.scale)
  );
}
