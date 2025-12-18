import { useAnnotationHandlerStore } from 'explorviz-frontend/src/stores/annotation-handler';
import { useLocalUserStore } from 'explorviz-frontend/src/stores/collaboration/local-user';
import { useDetachedMenuGroupsStore } from 'explorviz-frontend/src/stores/extended-reality/detached-menu-groups';
import { useLandscapeTokenStore } from 'explorviz-frontend/src/stores/landscape-token';
import { usePopupHandlerStore } from 'explorviz-frontend/src/stores/popup-handler';
import { useTimestampStore } from 'explorviz-frontend/src/stores/timestamp';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import {
  SerializedAnnotation,
  SerializedDetachedMenu,
  SerializedLandscape,
  SerializedPopup,
  SerializedRoom,
} from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/types/serialized-room';
import {
  DetachableMenu,
  isDetachableMenu,
} from 'explorviz-frontend/src/utils/extended-reality/vr-menus/detachable-menu';
import * as THREE from 'three';
import { create } from 'zustand';

interface RoomSerializerState {
  serializedRoom?: SerializedRoom;
  setSerializedRoom: (room: SerializedRoom | undefined) => void;
  serializeRoom: (snapshot?: boolean) => SerializedRoom;
  _serializeLandscape: () => SerializedLandscape;
  _serializeOpenPopups: (snapshot: boolean) => SerializedPopup[];
  _serializeOpenAnnotations: (snapshot: boolean) => SerializedAnnotation[];
  _serializeDetachedMenus: () => SerializedDetachedMenu[];
}

export const useRoomSerializerStore = create<RoomSerializerState>(
  (set, get) => ({
    serializedRoom: undefined,

    setSerializedRoom: (room: SerializedRoom | undefined) => {
      set({ serializedRoom: room });
    },

    serializeRoom: (snapshot: boolean = false): SerializedRoom => {
      const serializedRoom = {
        landscape: get()._serializeLandscape(),
        closedComponentIds: Array.from(
          useVisualizationStore.getState().closedComponentIds
        ),
        highlightedEntities: Array.from(
          useVisualizationStore.getState().highlightedEntityIds
        ).map((entityId) => {
          return {
            userId: useLocalUserStore.getState().userId,
            entityId: entityId,
          };
        }), // TODO: Add highlighted entities of remote users
        popups: get()._serializeOpenPopups(snapshot),
        annotations: get()._serializeOpenAnnotations(snapshot),
        detachedMenus: get()._serializeDetachedMenus(),
      };
      return serializedRoom;
    },

    // ToDo: Add both global and local positions
    // private
    _serializeLandscape: (): SerializedLandscape => {
      return {
        landscapeToken: useLandscapeTokenStore.getState().token?.value,
        timestamp: useTimestampStore
          .getState()
          .getLatestTimestampByCommitOrFallback('cross-commit'), // TODO: Handle commits properly
      };
    },

    /**
     * Change that if snapshot is created, that the pop up does not need to be shared
     * We always want to save a popup if pinned
     * @param popupData
     * @returns
     */
    // private
    _serializeOpenPopups: (snapshot: boolean): SerializedPopup[] => {
      return usePopupHandlerStore
        .getState()
        .popupData.filter((popup) => {
          return (
            (popup.isPinned && popup.sharedBy) || (popup.isPinned && snapshot)
          );
        })
        .map((popup) => {
          return {
            userId: popup.sharedBy,
            entityId: popup.entityId,
            menuId: popup.menuId,
          };
        });
    },

    // private
    _serializeOpenAnnotations: (snapshot: boolean): SerializedAnnotation[] => {
      return useAnnotationHandlerStore
        .getState()
        .annotationData.filter((annotation) => {
          return annotation.shared || snapshot;
        })
        .map((annotation) => {
          let entityId = undefined;

          if (annotation.entity !== undefined) {
            entityId = annotation.entity.id;
          }
          return {
            objectId: null,
            annotationId: annotation.annotationId,
            userId: annotation.sharedBy,
            entityId: entityId,
            menuId: annotation.menuId,
            annotationText: annotation.annotationText,
            annotationTitle: annotation.annotationTitle,
            owner: annotation.owner,
            shared: snapshot ? false : true,
            inEdit: annotation.inEdit,
            lastEditor: annotation.lastEditor,
          };
        });
    },

    // private
    _serializeDetachedMenus: (): SerializedDetachedMenu[] => {
      return useDetachedMenuGroupsStore
        .getState()
        .getDetachedMenus()
        .filter((detachedMenuGroup) =>
          isDetachableMenu(detachedMenuGroup.currentMenu)
        )
        .map((detachedMenuGroup) => {
          const detachedMenu = detachedMenuGroup.currentMenu as DetachableMenu;
          return {
            userId: null,
            objectId: detachedMenuGroup.getGrabId(),
            entityId: detachedMenu.getDetachId(),
            entityType: detachedMenu.getEntityType(),
            position: detachedMenuGroup
              .getWorldPosition(new THREE.Vector3())
              .toArray(),
            quaternion: detachedMenuGroup
              .getWorldQuaternion(new THREE.Quaternion())
              .toArray(),
            scale: detachedMenuGroup.scale.toArray(),
          };
        });
    },
  })
);
