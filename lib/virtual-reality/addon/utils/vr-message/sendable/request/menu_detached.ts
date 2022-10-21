import { EntityType, isEntityType } from '../../util/entity_type';
import { isNonce, Nonce } from '../../util/nonce';
import { isPosition, Position } from '../../util/position';
import { isQuaternion, Quaternion } from '../../util/quaternion';
import { isScale, Scale } from '../../util/Scale';

export const MENU_DETACHED_EVENT = 'menu_detached';

export type MenuDetachedMessage = {
  event: typeof MENU_DETACHED_EVENT;
  nonce: Nonce;
  detachId: string;
  entityType: EntityType;
  position: Position;
  quaternion: Quaternion;
  scale: Scale;
};

export function isMenuDetachedMessage(msg: any): msg is MenuDetachedMessage {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    msg.event === MENU_DETACHED_EVENT &&
    isNonce(msg.nonce) &&
    isEntityType(msg.entityType) &&
    typeof msg.detachId === 'string' &&
    isPosition(msg.position) &&
    isQuaternion(msg.quaternion) &&
    isScale(msg.scale)
  );
}
