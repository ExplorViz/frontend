import { EntityType } from '../vr-message/util/entity_type';
import { Position } from '../vr-message/util/position';
import { Quaternion } from '../vr-message/util/quaternion';
import { Scale } from '../vr-message/util/Scale';

export type SerializedDetachedMenu = {
  objectId: string | null;
  entityId: string;
  entityType: EntityType;
  position: Position;
  quaternion: Quaternion;
  scale: Scale;
};

export type SerializedHighlightedComponent = {
  userId: string;
  appId: string;
  entityType: string;
  entityId: string;
  isHighlighted: boolean;
};

export type SerialzedApp = {
  id: string;
  position: Position;
  quaternion: Quaternion;
  scale: Scale;
  openComponents: string[];
  highlightedComponents: SerializedHighlightedComponent[];
};

export type SerializedLandscape = {
  landscapeToken: string;
  timestamp: number;
};

export type SerializedVrRoom = {
  landscape: SerializedLandscape;
  openApps: SerialzedApp[];
  detachedMenus: SerializedDetachedMenu[];
};
