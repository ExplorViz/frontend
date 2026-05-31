import { EntityType } from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/types/entity-type';
import { Position } from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/types/position';
import { Quaternion } from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/types/quaternion';
import { Scale } from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/types/Scale';
import { VisualizationSettings } from 'explorviz-frontend/src/utils/settings/settings-schemas';

export type SerializedRoom = {
  landscape: SerializedLandscape;
  highlightedEntities: SerializedHighlightedEntity[];
  closedComponentIds: string[];
  popups: SerializedPopup[];
  annotations?: SerializedAnnotation[];
  visualizationSettings?: VisualizationSettings;
};

export type SerializedLandscape = {
  landscapeToken: string | undefined;
  timestamp: number;
};

export type SerializedHighlightedEntity = {
  userId: string;
  entityId: string;
};

export type SerializedPopup = {
  userId: string | null;
  entityId: string;
  menuId: string | null | undefined;
  mouseX?: number;
  mouseY?: number;
};

export type SerializedAnnotation = {
  objectId: string | null;
  annotationId: number;
  userId: string;
  entityId: string | undefined;
  menuId: string | null | undefined;
  annotationText: string;
  annotationTitle: string;
  owner: string;
  shared: boolean;
  inEdit: boolean;
  lastEditor: string;
  mouseX?: number;
  mouseY?: number;
  wasMoved?: boolean;
  hidden?: boolean;
  minimized?: boolean;
};

export type SerializedDetachedMenu = {
  objectId: string | null;
  userId: string | null;
  entityId: string;
  entityType: EntityType;
  position: Position;
  quaternion: Quaternion;
  scale: Scale;
};
