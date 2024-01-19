import { Scale } from 'collaborative-mode/utils/web-socket-messages/types/Scale';
import { EntityType } from 'collaborative-mode/utils/web-socket-messages/types/entity-type';
import { Position } from 'collaborative-mode/utils/web-socket-messages/types/position';
import { Quaternion } from 'collaborative-mode/utils/web-socket-messages/types/quaternion';

export type InitialRoomDetachedMenu = {
  entityId: string;
  entityType: EntityType;
  position: Position;
  quaternion: Quaternion;
  scale: Scale;
};

export type InitialRoomApp = {
  id: string;
  position: Position;
  quaternion: Quaternion;
  scale: Scale;
  openComponents: string[];
};

export type InitialRoomLandscape = {
  landscapeToken: string | undefined;
  timestamp: number;
};

export type InitialRoomPayload = {
  roomId: string;
  landscape: InitialRoomLandscape;
  openApps: InitialRoomApp[];
  detachedMenus: InitialRoomDetachedMenu[];
};
