import { SerializedHighlightedComponent } from 'virtual-reality/utils/vr-multi-user/serialized-vr-room';

export const USER_DISCONNECTED_EVENT = 'user_disconnect';

export type UserDisconnectedMessage = {
  event: typeof USER_DISCONNECTED_EVENT;
  id: string;
  highlightedComponents: SerializedHighlightedComponent[];
};

export function isUserDisconnectedMessage(
  msg: any
): msg is UserDisconnectedMessage {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    msg.event === USER_DISCONNECTED_EVENT &&
    typeof msg.id === 'string' &&
    Array.isArray(msg.highlightedComponents) &&
    msg.highlightedComponents.every((c: any) => typeof c === 'object')
  );
}
