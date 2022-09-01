export type RoomCreatedResponse = {
  roomId: string;
};

export function isRoomCreatedResponse(
  response: any,
): response is RoomCreatedResponse {
  return (
    response !== null
    && typeof response === 'object'
    && typeof response.roomId === 'string'
  );
}
