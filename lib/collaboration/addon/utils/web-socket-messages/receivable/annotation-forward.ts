export const ANNOTATION_FORWARD_EVENT = 'annotation';

export type AnnotationForwardMessage = {
  event: typeof ANNOTATION_FORWARD_EVENT;
  objectId: string;
  userId: string;
  annotationId: number;
  entityId: string | undefined;
  menuId: string | undefined;
  annotationTitle: string;
  annotationText: string;
  owner: string;
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
    typeof msg.annotationId === 'number' &&
    (typeof msg.entityId === 'string' || msg.entityId === undefined) &&
    (typeof msg.menuId === 'string' || msg.menuId === undefined) &&
    typeof msg.annotationTitle === 'string' &&
    typeof msg.annotationText === 'string' &&
    typeof msg.owner === 'string'
  );
}
