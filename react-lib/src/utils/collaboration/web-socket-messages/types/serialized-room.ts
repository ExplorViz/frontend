import { EntityType } from 'react-lib/src/utils/collaboration/web-socket-messages/types/entity-type';
import { Position } from 'react-lib/src/utils/collaboration/web-socket-messages/types/position';
import { Quaternion } from 'react-lib/src/utils/collaboration/web-socket-messages/types/quaternion';
import { Scale } from 'react-lib/src/utils/collaboration/web-socket-messages/types/Scale';

export type SerializedRoom = {
  landscape: SerializedLandscape;
  openApps: SerializedApp[];
  highlightedExternCommunicationLinks: SerializedHighlightedExternLink[];
  popups: SerializedPopup[];
  annotations?: SerializedAnnotation[];
  detachedMenus: SerializedDetachedMenu[];
};

export type SerializedLandscape = {
  landscapeToken: string | undefined;
  timestamp: number;
};

export type SerializedK8sNode = {
  name: string;
  namespaces: SerializedK8sNamespace[];
};

export type SerializedK8sNamespace = {
  name: string;
  pods: SerializedK8sPod[];
};

export type SerializedK8sPod = {
  name: string;
  applicationIds: string[];
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

export type SerializedPopup = {
  userId: string | null;
  entityId: string;
  menuId: string | null | undefined;
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
