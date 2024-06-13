export const ANNOTATION_CLOSED_EVENT = 'annotation_closed';

export type AnnotationClosedMessage = {
  event: typeof ANNOTATION_CLOSED_EVENT;
  annotationId: number;
};

export function isAnnotationClosedMessage(
  msg: any
): msg is AnnotationClosedMessage {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    msg.event === ANNOTATION_CLOSED_EVENT &&
    typeof msg.annotationId === 'number'
  );
}
