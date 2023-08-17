export type SynchronizationStartedResponse = {
  roomId: string;
};

export function isSynchronizationStartedResponse(
  response: any
): response is SynchronizationStartedResponse {
  return (
    response !== null &&
    typeof response === 'object' &&
    typeof response.roomId === 'string'
  );
}
