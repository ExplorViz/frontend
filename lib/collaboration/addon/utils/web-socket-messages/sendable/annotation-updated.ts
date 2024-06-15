import { Nonce, isNonce } from '../types/nonce';

export const ANNOTATION_UPDATED_EVENT = 'annotation_updated';

export type AnnotationUpdatedMessage = {
  event: typeof ANNOTATION_UPDATED_EVENT;
  nonce: Nonce;
  objectId: string;
  annotationId: number;
  annotationTitle: string;
  annotationText: string;
};

export function isAnnotationUpdatedMessage(
  msg: any
): msg is AnnotationUpdatedMessage {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    msg.event === ANNOTATION_UPDATED_EVENT &&
    typeof msg.objectId === 'string' &&
    typeof msg.annotationId === 'number' &&
    typeof msg.annotationTitle === 'string' &&
    typeof msg.annotationText === 'string' &&
    isNonce(msg.nonce)
  );
}
