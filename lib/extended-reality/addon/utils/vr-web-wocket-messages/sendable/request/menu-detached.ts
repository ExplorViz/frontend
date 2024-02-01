import {
  Scale,
  isScale,
} from 'collaboration/utils/web-socket-messages/types/Scale';
import {
  EntityType,
  isEntityType,
} from 'collaboration/utils/web-socket-messages/types/entity-type';
import {
  Nonce,
  isNonce,
} from 'collaboration/utils/web-socket-messages/types/nonce';
import {
  Position,
  isPosition,
} from 'collaboration/utils/web-socket-messages/types/position';
import {
  Quaternion,
  isQuaternion,
} from 'collaboration/utils/web-socket-messages/types/quaternion';

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
