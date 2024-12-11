export const ANNOTATION_UPDATED_FORWARD_EVENT = 'annotation_updated';

export type AnnotationUpdatedForwardMessage = {
  event: typeof ANNOTATION_UPDATED_FORWARD_EVENT;
  objectId: string;
  annotationId: number;
  annotationTitle: string;
  annotationText: string;
  lastEditor: string;
};

export function isAnnotationUpdatedForwardMessage(
  msg: any
): msg is AnnotationUpdatedForwardMessage {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    msg.event === ANNOTATION_UPDATED_FORWARD_EVENT &&
    typeof msg.object === 'string' &&
    typeof msg.annotationId === 'number' &&
    typeof msg.annotationTitle === 'string' &&
    typeof msg.annotationText === 'string' &&
    typeof msg.lastEditor === 'string'
  );
}
