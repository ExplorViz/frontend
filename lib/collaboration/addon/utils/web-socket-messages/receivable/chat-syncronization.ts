export const CHAT_SYNC_EVENT = 'chat_synchronization';

export type ChatSynchronizeMessage = {
  event: typeof CHAT_SYNC_EVENT;
  userId: string;
  msg: string;
  userName: string;
  timestamp: string;
  isEvent: boolean;
  eventType: string;
  eventData: any[];
};

export function isChatSyncMessage(msg: any): msg is ChatSynchronizeMessage {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    msg.event === CHAT_SYNC_EVENT &&
    typeof msg.userid === 'string' &&
    typeof msg.msg === 'string' &&
    typeof msg.userName === 'string' &&
    typeof msg.timestamp === 'string' &&
    typeof msg.isEvent === 'boolean' &&
    typeof msg.eventType === 'string' &&
    Array.isArray(msg.eventData)
  );
}
