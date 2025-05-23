import {
  Scale,
  isScale,
} from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/types/Scale';
import {
  EntityType,
  isEntityType,
} from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/types/entity-type';
import {
  Position,
  isPosition,
} from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/types/position';
import {
  Quaternion,
  isQuaternion,
} from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/types/quaternion';
import { SerializedHighlightedExternLink } from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/types/serialized-room';

export const INITIAL_LANDSCAPE_EVENT = 'landscape';

type HighlightedComponent = {
  userId: string;
  appId: string;
  entityType: string;
  entityId: string;
  isHighlighted: boolean;
};

type DetachedMenu = {
  objectId: string;
  entityId: string;
  entityType: EntityType;
  position: Position;
  quaternion: Quaternion;
  scale: Scale;
};

type Annotation = {
  objectId: string | null;
  annotationId: number;
  userId: string;
  sharedBy: string;
  entityId: string | undefined;
  menuId: string | null | undefined;
  annotationText: string;
  annotationTitle: string;
  owner: string;
  shared: boolean;
  inEdit: boolean;
  lastEditor: string;
};

type App = {
  id: string;
  position: Position;
  quaternion: Quaternion;
  scale: Scale;
  openComponents: string[];
  highlightedComponents: HighlightedComponent[];
};

type Landscape = {
  landscapeToken: string;
  timestamp: number;
  position: Position;
  quaternion: Quaternion;
  scale: Scale;
};

export type InitialLandscapeMessage = {
  event: typeof INITIAL_LANDSCAPE_EVENT;
  openApps: App[];
  landscape: Landscape;
  detachedMenus: DetachedMenu[];
  highlightedExternCommunicationLinks: SerializedHighlightedExternLink[];
  annotations: Annotation[];
};

function isHighlightedComponent(comp: any): comp is HighlightedComponent {
  return (
    comp !== null &&
    typeof comp === 'object' &&
    typeof comp.userId === 'string' &&
    typeof comp.appId === 'string' &&
    typeof comp.entityType === 'string' &&
    typeof comp.entityId === 'string' &&
    typeof comp.isHighlighted === 'boolean'
  );
}

function isDetachedMenu(menu: any): menu is DetachedMenu {
  return (
    menu !== null &&
    typeof menu === 'object' &&
    typeof menu.objectId === 'string' &&
    isEntityType(menu.entityType) &&
    typeof menu.entityId === 'string' &&
    isPosition(menu.position) &&
    isQuaternion(menu.quaternion) &&
    isScale(menu.scale)
  );
}

function isApp(app: any): app is App {
  return (
    app !== null &&
    typeof app === 'object' &&
    typeof app.id === 'string' &&
    isPosition(app.position) &&
    isQuaternion(app.quaternion) &&
    isScale(app.scale) &&
    Array.isArray(app.highlightedComponents) &&
    app.highlightedComponents.every(isHighlightedComponent)
  );
}

function isLandscape(landscape: any): landscape is Landscape {
  return (
    landscape !== null &&
    typeof landscape === 'object' &&
    typeof landscape.landscapeToken === 'string' &&
    typeof landscape.timestamp === 'number' &&
    isPosition(landscape.position) &&
    isQuaternion(landscape.quaternion) &&
    isScale(landscape.scale)
  );
}

export function isInitialLandscapeMessage(
  msg: any
): msg is InitialLandscapeMessage {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    msg.event === INITIAL_LANDSCAPE_EVENT &&
    Array.isArray(msg.openApps) &&
    msg.openApps.every(isApp) &&
    Array.isArray(msg.detachedMenus) &&
    msg.detachedMenus.every(isDetachedMenu) &&
    isLandscape(msg.landscape)
  );
}
