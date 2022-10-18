export const POPUP_CLOSED_EVENT = 'popup_closed';

export type PopupClosedMessage = {
  event: typeof POPUP_CLOSED_EVENT;
  applicationId: string;
  meshId: string;
};

export function isPopupOpenedMessage(msg: any): msg is PopupClosedMessage {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    msg.event === POPUP_CLOSED_EVENT &&
    typeof msg.id === 'string'
  );
}
