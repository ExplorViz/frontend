export const MENU_DETACHED_RESPONSE_EVENT = 'menu_detached_response';

export type MenuDetachedResponse = {
  objectId: string;
};

export function isMenuDetachedResponse(msg: any): msg is MenuDetachedResponse {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    typeof msg.objectId === 'string'
  );
}
