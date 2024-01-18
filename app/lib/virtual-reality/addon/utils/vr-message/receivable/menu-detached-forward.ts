import { EntityType, isEntityType } from '../util/entity_type';
import { isPosition, Position } from '../util/position';
import { isQuaternion, Quaternion } from '../util/quaternion';
import { isScale, Scale } from '../util/Scale';

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
