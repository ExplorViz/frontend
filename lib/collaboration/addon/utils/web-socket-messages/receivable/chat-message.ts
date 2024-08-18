export const CHAT_MESSAGE_EVENT = 'chat_message';

export type ChatMessage = {
  event: typeof CHAT_MESSAGE_EVENT;
  userid: string;
  msg: string;
  userName: string;
  timestamp: string;
  isEvent: boolean;
  eventType: string;
  eventData: any[];
};

export function isChatMessageReceived(msg: any): msg is ChatMessage {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    msg.event === CHAT_MESSAGE_EVENT &&
    typeof msg.userid === 'string' &&
    typeof msg.msg === 'string' &&
    typeof msg.userName === 'string' &&
    typeof msg.timestamp === 'string' &&
    typeof msg.isEvent === 'boolean' &&
    typeof msg.eventType === 'string' &&
    Array.isArray(msg.eventData)
  );
}
