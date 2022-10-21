export type RoomListRecord = {
  roomId: string;
  roomName: string;
  landscapeToken: string;
  size: number;
  alias?: string;
};

export function isRoomListRecord(record: any): record is RoomListRecord {
  return (
    record !== null &&
    typeof record === 'object' &&
    typeof record.roomId === 'string' &&
    typeof record.roomName === 'string' &&
    typeof record.landscapeToken === 'string' &&
    typeof record.size === 'number'
  );
}
