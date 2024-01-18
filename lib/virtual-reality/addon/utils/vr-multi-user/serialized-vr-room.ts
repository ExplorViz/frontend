import { EntityType } from '../vr-message/util/entity_type';
import { Position } from '../vr-message/util/position';
import { Quaternion } from '../vr-message/util/quaternion';
import { Scale } from '../vr-message/util/Scale';

export type SerializedDetachedMenu = {
  objectId: string | null;
  userId: string | null;
  entityId: string;
  entityType: EntityType;
  position: Position;
  quaternion: Quaternion;
  scale: Scale;
};

export type SerializedHighlightedComponent = {
  userId: string;
  highlightedApp: string;
  entityType: string;
  highlightedEntity: string;
  isHighlighted: boolean;
  color: number[];
};

export type SerializedHighlightedExternLink = {
  appId: string;
  color: number[];
  entityId: string;
  entityType: string;
  isHighlighted: boolean;
  userdId: string;
};

export type SerializedApp = {
  id: string;
  position: Position;
  quaternion: Quaternion;
  scale: Scale;
  transparentComponents: string[];
  openComponents: string[];
  highlightedComponents: SerializedHighlightedComponent[];
};

export type SerializedLandscape = {
  landscapeToken: string | undefined;
  timestamp: number;
};

export type SerializedVrRoom = {
  landscape: SerializedLandscape;
  openApps: SerializedApp[];
  detachedMenus: SerializedDetachedMenu[];
  highlightedExternCommunicationLinks: SerializedHighlightedExternLink[];
};
