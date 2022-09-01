export const TIMESTAMP_UPDATE_EVENT = 'timestamp_update';

export type TimestampUpdateMessage = {
  event: typeof TIMESTAMP_UPDATE_EVENT;
  timestamp: number;
};

export function isTimestampUpdateMessage(
  msg: any,
): msg is TimestampUpdateMessage {
  return (
    msg !== null
    && typeof msg === 'object'
    && msg.event === TIMESTAMP_UPDATE_EVENT
    && typeof msg.timestamp === 'number'
  );
}
