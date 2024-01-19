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
  userId: string;
  highlightedApp: string;
  entityType: string;
  highlightedEntity: string;
  isHighlighted: boolean;
  color: number[];
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

export type SerializedRoom = {
  landscape: SerializedLandscape;
  openApps: SerializedApp[];
  detachedMenus: SerializedDetachedMenu[];
  highlightedExternCommunicationLinks: SerializedHighlightedComponent[];
  //transparentExternCommunicationLinks: string[];
};
