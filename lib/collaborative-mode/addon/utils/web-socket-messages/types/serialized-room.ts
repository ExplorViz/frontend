import { EntityType } from './entity-type';
import { Position } from './position';
import { Quaternion } from './quaternion';
import { Scale } from './Scale';

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
  appId: string;
  userId: string;
  entityType: string;
  entityId: string;
  isHighlighted: boolean;
  color: number[];
};

export type SerializedHighlightedExternLink = {
  appId: string;
  color: number[];
  entityId: string;
  entityType: string;
  isHighlighted: boolean;
  userId: string;
};

export type SerializedApp = {
  id: string;
  position: Position;
  quaternion: Quaternion;
  scale: Scale;
  openComponents: string[];
  transparentComponents: string[];
  highlightedComponents: SerializedHighlightedComponent[];
};

export type SerializedLandscape = {
  landscapeToken: string | undefined;
  timestamp: number;
};

export type SerializedRoom = {
  landscape: SerializedLandscape;
  openApps: SerializedApp[];
  detachedMenus: SerializedDetachedMenu[];
  highlightedExternCommunicationLinks: SerializedHighlightedExternLink[];
};
