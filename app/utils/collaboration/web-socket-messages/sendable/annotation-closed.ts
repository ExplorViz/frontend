import { Nonce, isNonce } from '../types/nonce';

export const ANNOTATION_CLOSED_EVENT = 'annotation_closed';

export type AnnotationClosedMessage = {
  event: typeof ANNOTATION_CLOSED_EVENT;
  menuId: string;
  nonce: Nonce;
};

export function isAnnotationClosedMessage(
  msg: any
): msg is AnnotationClosedMessage {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    msg.event === ANNOTATION_CLOSED_EVENT &&
    isNonce(msg.nonce) &&
    typeof msg.menuId === 'string'
  );
}
