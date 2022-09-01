export type LobbyJoinedResponse = {
  ticketId: string;
};

export function isLobbyJoinedResponse(
  response: any,
): response is LobbyJoinedResponse {
  return (
    response !== null
    && typeof response === 'object'
    && typeof response.ticketId === 'string'
  );
}
