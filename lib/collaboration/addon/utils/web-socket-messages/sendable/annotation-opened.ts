import { Scale, isScale } from '../types/Scale';
import { Nonce, isNonce } from '../types/nonce';
import { Position, isPosition } from '../types/position';
import { Quaternion, isQuaternion } from '../types/quaternion';

export const ANNOTATION_OPENED_EVENT = 'annotation_opened';

export type AnnotationOpenedMessage = {
  event: typeof ANNOTATION_OPENED_EVENT;
  nonce: Nonce;
  annotationId: number;
  entityId: string | undefined;
  entityType: string | undefined;
  position: Position;
  quaternion: Quaternion;
  scale: Scale;
  menuId: string | null;
  annotationTitle: string;
  annotationText: string;
};

export function isAnnotationOpenedMessage(
  msg: any
): msg is AnnotationOpenedMessage {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    msg.event === ANNOTATION_OPENED_EVENT &&
    typeof msg.annotationId === 'number' &&
    (typeof msg.entityId === 'string' || typeof msg.entityId === 'undefined') &&
    (typeof msg.entityType === 'string' ||
      typeof msg.entityType === 'undefined') &&
    isNonce(msg.nonce) &&
    isPosition(msg.position) &&
    isQuaternion(msg.quaternion) &&
    isScale(msg.scale) &&
    (typeof msg.menuId === 'string' || msg.menuId === null) &&
    typeof msg.annotationTitle === 'string' &&
    typeof msg.annotationText === 'string'
  );
}
