export const OBJECT_CLOSED_RESPONSE_EVENT = 'object_closed_response';

export type ObjectClosedResponse = {
  event: typeof OBJECT_CLOSED_RESPONSE_EVENT;
  isSuccess: boolean;
};

export function isObjectClosedResponse(msg: any): msg is ObjectClosedResponse {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    msg.event === OBJECT_CLOSED_RESPONSE_EVENT &&
    typeof msg.isSuccess === 'boolean'
  );
}
