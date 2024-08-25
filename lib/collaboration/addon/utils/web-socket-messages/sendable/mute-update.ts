export const USER_MUTE_EVENT = 'user_mute_update';

export type UserMuteUpdate = {
  event: typeof USER_MUTE_EVENT;
  userId: string;
};

export function isUserMuteEvent(msg: any): msg is UserMuteUpdate {
  return (
    msg !== null && typeof msg === 'object' && msg.event === USER_MUTE_EVENT && typeof msg.userId === 'string'
  );
}
