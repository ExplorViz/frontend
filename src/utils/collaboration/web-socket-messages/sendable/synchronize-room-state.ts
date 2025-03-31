import {
  InitialRoomApp,
  InitialRoomDetachedMenu,
  InitialRoomLandscape,
} from 'explorviz-frontend/src/utils/collaboration/room-payload/sendable/initial-room';
import {
  SerializedAnnotation,
  SerializedHighlightedExternLink,
  SerializedPopup,
} from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/types/serialized-room';

export const SYNC_ROOM_STATE_EVENT = 'sync_room_state';

export type SyncRoomStateMessage = {
  event: typeof SYNC_ROOM_STATE_EVENT;
  landscape: InitialRoomLandscape;
  openApps: InitialRoomApp[];
  highlightedExternCommunicationLinks: SerializedHighlightedExternLink[];
  popups: SerializedPopup[];
  annotations: SerializedAnnotation[];
  detachedMenus: InitialRoomDetachedMenu[];
};

export function isSyncRoomStateMessage(msg: any): msg is SyncRoomStateMessage {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    msg.event === SYNC_ROOM_STATE_EVENT
  );
}
