import { Scale } from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/types/Scale';
import { EntityType } from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/types/entity-type';
import { Position } from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/types/position';
import { Quaternion } from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/types/quaternion';

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
  owner: string;
};

export type InitialRoomLandscape = {
  landscapeToken: string | undefined;
  timestamp: number;
};

export type InitialRoomPayload = {
  roomId: string;
  landscape: InitialRoomLandscape;
  closedComponentIds: string[];
  highlightedEntityIds: string[];
  detachedMenus: InitialRoomDetachedMenu[];
  annotations: InitialAnnotations[];
};
