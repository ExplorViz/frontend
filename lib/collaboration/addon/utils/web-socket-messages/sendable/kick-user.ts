export const USER_KICK_EVENT = 'user_kick_event';

export type UserKickEvent = {
  event: typeof USER_KICK_EVENT;
  userId: string;
};

export function isUserKickEvent(msg: any): msg is UserKickEvent {
  return (
    msg !== null && typeof msg === 'object' && msg.event === USER_KICK_EVENT && typeof msg.userId === 'string'
  );
}
