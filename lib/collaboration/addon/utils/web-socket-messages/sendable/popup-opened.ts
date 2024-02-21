import { Position, isPosition } from '../types/position';

export const POPUP_OPENED_EVENT = 'popup_opened';

export type PopupOpenedMessage = {
  event: typeof POPUP_OPENED_EVENT;
  applicationId: string;
  entityId: string;
  position: Position;
};

export function isPopupOpenedMessage(msg: any): msg is PopupOpenedMessage {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    msg.event === POPUP_OPENED_EVENT &&
    typeof msg.applicationId === 'string' &&
    typeof msg.entityId === 'string' &&
    isPosition(msg.position)
  );
}
