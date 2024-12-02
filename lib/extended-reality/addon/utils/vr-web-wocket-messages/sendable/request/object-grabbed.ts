import {
  Nonce,
  isNonce,
} from 'explorviz-frontend/utils/collaboration/web-socket-messages/types/nonce';

export const OBJECT_GRABBED_EVENT = 'object_grabbed';

export type ObjectGrabbedMessage = {
  event: typeof OBJECT_GRABBED_EVENT;
  nonce: Nonce;
  objectId: string;
};

export function isObjectGrabbedMessage(msg: any): msg is ObjectGrabbedMessage {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    msg.event === OBJECT_GRABBED_EVENT &&
    isNonce(msg.nonce) &&
    typeof msg.objectId === 'string'
  );
}
