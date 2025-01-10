export const MESSAGE_DELETE_EVENT = 'message_delete_event';

export type MessageDeleteEvent = {
  event: typeof MESSAGE_DELETE_EVENT;
  msgIds: number[];
};

export function isMessageDeleteEvent(msg: any): msg is MessageDeleteEvent {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    msg.event === MESSAGE_DELETE_EVENT &&
    Array.isArray(msg.msgId)
  );
}
