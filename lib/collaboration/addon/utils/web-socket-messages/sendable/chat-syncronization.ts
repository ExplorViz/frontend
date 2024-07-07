export const CHAT_SYNC_EVENT = 'chat_synchronization';

export type ChatSynchronizeMessage = {
  event: typeof CHAT_SYNC_EVENT;
};

export function isChatSyncMessage(
  msg: any
): msg is ChatSynchronizeMessage {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    msg.event === CHAT_SYNC_EVENT
  );
}
