export const SYNCHRONIZATION_START_EVENT = 'synchronization_start';

export type SynchronizationStartMessage = {
  event: typeof SYNCHRONIZATION_START_EVENT;
  isSynchronizing: boolean;
  main: string | null;
};

export function isSynchronizingUpdateMessage(
  msg: any
): msg is SynchronizationStartMessage {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    msg.event === SYNCHRONIZATION_START_EVENT &&
    typeof msg.isSynchronizing === 'boolean' &&
    (typeof msg.main === 'string' || msg.main === null)
  );
}
