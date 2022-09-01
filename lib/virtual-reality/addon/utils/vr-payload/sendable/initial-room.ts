import { EntityType } from '../../vr-message/util/entity_type';
import { Position } from '../../vr-message/util/position';
import { Quaternion } from '../../vr-message/util/quaternion';
import { Scale } from '../../vr-message/util/Scale';

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
  landscapeToken: string;
  timestamp: number;
  position: Position;
  quaternion: Quaternion;
  scale: Scale;
};

export type InitialRoomPayload = {
  landscape: InitialRoomLandscape;
  openApps: InitialRoomApp[];
  detachedMenus: InitialRoomDetachedMenu[];
};
