const MENU_DETACHED_RESPONSE_EVENT = 'menu_detached';

export type MenuDetachedResponse = {
  event: typeof MENU_DETACHED_RESPONSE_EVENT;
  objectId: string;
};

export function isMenuDetachedResponse(msg: any): msg is MenuDetachedResponse {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    msg.event === MENU_DETACHED_RESPONSE_EVENT &&
    typeof msg.objectId === 'string'
  );
}
