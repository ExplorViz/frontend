export const CHAT_MESSAGE_EVENT = 'chat_message';

export type ChatMessage = {
  event: typeof CHAT_MESSAGE_EVENT;
  userId: string;
  msg: string;
  userName: string;
  timestamp: string;
};

export function isChatMessage(msg: any): msg is ChatMessage {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    msg.event === CHAT_MESSAGE_EVENT &&
    typeof msg.userId === 'string' &&
    typeof msg.msg === 'string' &&
    typeof msg.userName === 'string' &&
    typeof msg.timestamp === 'string'
  );
}
