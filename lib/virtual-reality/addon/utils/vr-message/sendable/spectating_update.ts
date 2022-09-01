export const SPECTATING_UPDATE_EVENT = 'spectating_update';

export type SpectatingUpdateMessage = {
  event: typeof SPECTATING_UPDATE_EVENT;
  isSpectating: boolean;
  spectatedUser: string | null;
};

export function isSpectatingUpdateMessage(
  msg: any,
): msg is SpectatingUpdateMessage {
  return (
    msg !== null
    && typeof msg === 'object'
    && msg.event === SPECTATING_UPDATE_EVENT
    && typeof msg.isSpectating === 'boolean'
    && (typeof msg.spectatedUser === 'string' || msg.spectatedUser === null)
  );
}
