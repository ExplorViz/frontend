import { Scale } from 'collaboration/utils/web-socket-messages/types/Scale';
import { EntityType } from 'collaboration/utils/web-socket-messages/types/entity-type';
import { Position } from 'collaboration/utils/web-socket-messages/types/position';
import { Quaternion } from 'collaboration/utils/web-socket-messages/types/quaternion';

export type InitialRoomDetachedMenu = {
  entityId: string;
  entityType: EntityType;
  position: Position;
  quaternion: Quaternion;
  scale: Scale;
};

export type InitialAnnotations = {
  entityId: string | undefined;
  menuId: string | null | undefined;
  annotationText: string;
  annotationTitle: string;
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
  annotations: InitialAnnotations[];
};
