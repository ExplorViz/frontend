export const USER_DISCONNECTED_EVENT = 'user_disconnect';

export type UserDisconnectedMessage = {
  event: typeof USER_DISCONNECTED_EVENT;
  id: string;
};

export function isUserDisconnectedMessage(
  msg: any
): msg is UserDisconnectedMessage {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    msg.event === USER_DISCONNECTED_EVENT &&
    typeof msg.id === 'string'
  );
}
