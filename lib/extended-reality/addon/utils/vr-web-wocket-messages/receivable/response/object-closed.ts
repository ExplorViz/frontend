export const OBJECT_CLOSED_RESPONSE_EVENT = 'object_closed_response';

export type ObjectClosedResponse = {
  isSuccess: boolean;
};

export function isObjectClosedResponse(msg: any): msg is ObjectClosedResponse {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    typeof msg.isSuccess === 'boolean'
  );
}
