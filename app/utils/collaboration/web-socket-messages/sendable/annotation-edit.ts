import { Nonce, isNonce } from '../types/nonce';

export const ANNOTATION_EDIT_EVENT = 'annotation_edit';

export type AnnotationEditMessage = {
  event: typeof ANNOTATION_EDIT_EVENT;
  nonce: Nonce;
  objectId: string;
};

export function isAnnotationEditMessage(
  msg: any
): msg is AnnotationEditMessage {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    msg.event === ANNOTATION_EDIT_EVENT &&
    typeof msg.objectId === 'string' &&
    isNonce(msg.nonce)
  );
}
