export const CHAT_MESSAGE_EVENT = 'chat_message';

export type ChatMessage = {
  event: typeof CHAT_MESSAGE_EVENT;
  userid: string;
  msg: string;
  timestamp: string;
};

export function isChatMessageReceived(msg: any): msg is ChatMessage {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    msg.event === CHAT_MESSAGE_EVENT &&
    typeof msg.userid === 'string' &&
    typeof msg.msg === 'string' &&
    typeof msg.timestamp === 'string'
  );
}
