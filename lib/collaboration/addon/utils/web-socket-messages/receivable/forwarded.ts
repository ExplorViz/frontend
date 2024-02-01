export const FORWARDED_EVENT = 'forward';

export type ForwardedMessage<T> = {
  event: typeof FORWARDED_EVENT;
  userId: string;
  originalMessage: T;
};

export function isForwardedMessage(msg: any): msg is ForwardedMessage<any> {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    msg.event === FORWARDED_EVENT &&
    typeof msg.userId === 'string'
  );
}

export function isForwardedMessageOf<T>(
  msg: any,
  isT: (x: any) => x is T
): msg is ForwardedMessage<T> {
  return isForwardedMessage(msg) && isT(msg.originalMessage);
}
