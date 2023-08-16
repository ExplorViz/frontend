export const SYNCHRONIZING_UPDATE_EVENT = 'synchronizing_update';

export type SynchronizingUpdateMessage = {
  event: typeof SYNCHRONIZING_UPDATE_EVENT;
  isSynchronizing: boolean;
  main: string | null;
};

export function isSynchronizingUpdateMessage(
  msg: any
): msg is SynchronizingUpdateMessage {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    msg.event === SYNCHRONIZING_UPDATE_EVENT &&
    typeof msg.isSynchronizing === 'boolean' &&
    (typeof msg.main === 'string' || msg.main === null)
  );
}
