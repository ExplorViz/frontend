import { Nonce, isNonce } from '../types/nonce';

export const ANNOTATION_OPENED_EVENT = 'annotation';

export type AnnotationOpenedMessage = {
  event: typeof ANNOTATION_OPENED_EVENT;
  nonce: Nonce;
  annotationId: number;
  entityId: string | undefined;
  menuId: string | null;
  annotationTitle: string;
  annotationText: string;
  owner: string;
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
    isNonce(msg.nonce) &&
    (typeof msg.menuId === 'string' || msg.menuId === null) &&
    typeof msg.annotationTitle === 'string' &&
    typeof msg.annotationText === 'string' &&
    typeof msg.owner === 'string'
  );
}
