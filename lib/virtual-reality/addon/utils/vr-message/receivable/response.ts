export const RESPONSE_EVENT = 'response';

export type ResponseMessage<T> = {
  event: typeof RESPONSE_EVENT;
  nonce: number;
  response: T;
};

export function isResponseMessage(msg: any): msg is ResponseMessage<any> {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    msg.event === RESPONSE_EVENT &&
    typeof msg.nonce === 'number'
  );
}

export function isResponseMessageOf<T>(
  msg: any,
  isT: (x: any) => x is T
): msg is ResponseMessage<T> {
  return isResponseMessage(msg) && isT(msg.response);
}
