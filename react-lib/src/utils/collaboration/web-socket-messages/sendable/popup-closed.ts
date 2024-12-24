export const POPUP_CLOSED_EVENT = 'popup_closed';

export type PopupClosedMessage = {
  event: typeof POPUP_CLOSED_EVENT;
  applicationId: string;
  entityId: string;
};

export function isPopupClosedMessage(msg: any): msg is PopupClosedMessage {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    msg.event === POPUP_CLOSED_EVENT &&
    typeof msg.applicationId === 'string' &&
    typeof msg.entityId === 'string'
  );
}
