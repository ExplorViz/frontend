export const SYNCHRONIZATION_UPDATE_EVENT = 'synchronization_update';

export type SynchronizationUpdateMessage = {
  event: typeof SYNCHRONIZATION_UPDATE_EVENT;
  isSynchronizing: boolean;
  main: string | null;
};

export function isSynchronizingUpdateMessage(
  msg: any
): msg is SynchronizationUpdateMessage {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    msg.event === SYNCHRONIZATION_UPDATE_EVENT &&
    typeof msg.isSynchronizing === 'boolean' &&
    (typeof msg.main === 'string' || msg.main === null)
  );
}
