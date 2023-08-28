export const OBJECT_GRABBED_RESPONSE_EVENT = 'object_grabbed_response';

export type ObjectGrabbedResponse = {
  isSuccess: boolean;
};

export function isObjectGrabbedResponse(
  msg: any
): msg is ObjectGrabbedResponse {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    typeof msg.isSuccess === 'boolean'
  );
}
