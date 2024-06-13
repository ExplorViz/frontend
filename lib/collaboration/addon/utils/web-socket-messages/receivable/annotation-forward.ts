import { Scale, isScale } from '../types/Scale';
import { isEntityType } from '../types/entity-type';
import { Position, isPosition } from '../types/position';
import { Quaternion, isQuaternion } from '../types/quaternion';

export const ANNOTATION_FORWARD_EVENT = 'annotation';

export type AnnotationForwardMessage = {
  event: typeof ANNOTATION_FORWARD_EVENT;
  objectId: string;
  userId: string;
  entityId: string | undefined;
  entityType: string | undefined;
  menuId: string | undefined;
  annotationTitle: string;
  annotationText: string;
  position: Position;
  quaternion: Quaternion;
  scale: Scale;
};

export function isAnnotationForwardMessage(
  msg: any
): msg is AnnotationForwardMessage {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    msg.event === ANNOTATION_FORWARD_EVENT &&
    typeof msg.objectId === 'string' &&
    typeof msg.userId === 'string' &&
    (isEntityType(msg.entityType) || msg.entityType === undefined) &&
    (typeof msg.entityId === 'string' || msg.entityId === undefined) &&
    (typeof msg.menuId === 'string' || msg.menuId === undefined) &&
    typeof msg.annotationTitle === 'string' &&
    typeof msg.annotationText === 'string' &&
    isPosition(msg.position) &&
    isQuaternion(msg.quaternion) &&
    isScale(msg.scale)
  );
}
