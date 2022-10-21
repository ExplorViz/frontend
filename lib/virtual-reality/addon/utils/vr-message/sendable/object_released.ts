export const OBJECT_RELEASED_EVENT = 'object_released';

export type ObjectReleasedMessage = {
  event: typeof OBJECT_RELEASED_EVENT;
  objectId: string;
};

export function isObjectReleasedMessage(
  msg: any
): msg is ObjectReleasedMessage {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    msg.event === OBJECT_RELEASED_EVENT &&
    typeof msg.objectId === 'string'
  );
}
