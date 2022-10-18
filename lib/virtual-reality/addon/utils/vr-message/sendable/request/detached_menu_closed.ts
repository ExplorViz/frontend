import { isNonce, Nonce } from '../../util/nonce';

export const DETACHED_MENU_CLOSED_EVENT = 'detached_menu_closed';

export type DetachedMenuClosedMessage = {
  event: typeof DETACHED_MENU_CLOSED_EVENT;
  nonce: Nonce;
  menuId: string;
};

export function isDetachedMenuClosedMessage(
  msg: any
): msg is DetachedMenuClosedMessage {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    msg.event === DETACHED_MENU_CLOSED_EVENT &&
    isNonce(msg.nonce) &&
    typeof msg.menuId === 'string'
  );
}
